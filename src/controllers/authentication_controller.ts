import type { Request, Response } from 'express';
import { try_catch_handler } from '../middleware/centralized_error_handler';
import z from 'zod';
import {
  sign_in_schema,
  sign_up_schema,
} from '../schema/authentication_validation';
import { prisma } from '../config/database';
import { gen_jwt, response_helper } from '../utils/utils';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { aj } from '../config/arcjet_config';
import {
  limiter_consecutive_fails_by_email_and_ip,
  limiter_slow_brute_by_ip,
  max_wrong_attempts_by_ip_par_day,
} from '../config/flexible_rate_limiter';
import { is_rate_limiter_res } from '../utils/error_handler';
import jwt from 'jsonwebtoken';

export const sign_up_controller = try_catch_handler(
  async (req: Request, res: Response) => {
    const { email, name, password } = req.body as z.infer<
      typeof sign_up_schema
    >;

    const decision = await aj.protect(req, {
      email,
    });

    if (decision.isDenied()) {
      let message;

      if (decision.reason.type?.includes('DISPOSABLE')) {
        message = 'We do not allow disposable email addresses.';
      } else if (decision.reason.type?.includes('FREE')) {
        message =
          'We do not allow free email addresses, please use a business address.';
      } else if (decision.reason.type?.includes('NO_MX_RECORDS')) {
        message =
          'Your email domain does not have an MX record. Is there a typo?';
      } else if (decision.reason.type?.includes('NO_GRAVATAR')) {
        message = 'We require a Gravatar profile to sign up.';
      } else {
        message = 'Invalid email.';
      }

      return response_helper({
        name: getReasonPhrase(StatusCodes.FORBIDDEN),
        status_code: StatusCodes.FORBIDDEN,
        res,
        message,
      });
    }

    const user_is_exist = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (user_is_exist) {
      return response_helper({
        message: 'User Already Sign Up Please login',
        res,
        status_code: StatusCodes.METHOD_NOT_ALLOWED,
        name: getReasonPhrase(StatusCodes.METHOD_NOT_ALLOWED),
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash_pass = bcrypt.hashSync(password, salt);

    const new_user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash_pass,
      },
      select: {
        id: true,
      },
    });

    const token = await gen_jwt({ user: { id: new_user.id } });
    const decode = (await jwt.decode(token)) as { exp: number };

    response_helper({
      status_code: StatusCodes.CREATED,
      name: getReasonPhrase(StatusCodes.CREATED),
      message: 'User Sign up successfully',
      res,
      data: {
        user: { id: new_user.id, name, email },
        token,
        expireAt: decode.exp * 1000,
      },
    });
  },
);

export const sign_in_controller = try_catch_handler(
  async (req: Request, res: Response) => {
    const ip_add = req.ip;

    const { email, password } = req.body as z.infer<typeof sign_in_schema>;

    if (!ip_add) {
      return response_helper({
        message: 'Unable to process request. Please try again later.',
        name: getReasonPhrase(StatusCodes.BAD_REQUEST),
        res,
        status_code: StatusCodes.BAD_REQUEST,
      });
    }

    const [res_email_and_ip, res_slow_by_ip] = await Promise.all([
      limiter_consecutive_fails_by_email_and_ip.get(`${ip_add}_${email}`),
      limiter_slow_brute_by_ip.get(ip_add),
    ]);

    let retry_secs = 0;

    if (
      res_slow_by_ip !== null &&
      res_slow_by_ip.consumedPoints > max_wrong_attempts_by_ip_par_day
    ) {
      retry_secs = Math.round(res_slow_by_ip.msBeforeNext / 1000) || 1;

      res.set('Retry-After', String(retry_secs));
    }

    if (retry_secs > 0) {
      return response_helper({
        message: 'Too many requests. Please try again later.',
        name: getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
        status_code: StatusCodes.TOO_MANY_REQUESTS,
        res,
      });
    }
    const user_is_exist = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        password: true,
        name: true,
        id: true,
      },
    });

    if (!user_is_exist) {
      try {
        await limiter_slow_brute_by_ip.consume(ip_add);
      } catch (error) {
        if (is_rate_limiter_res(error)) {
          res.set(
            'Retry-After',
            String(Math.round(error.msBeforeNext / 1000)) || '1',
          );
          return response_helper({
            message: 'Too many requests. Please try again later.',
            name: getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
            status_code: StatusCodes.TOO_MANY_REQUESTS,
            res,
          });
        }
        throw error;
      }
      return response_helper({
        message: 'Access denied. Invalid credential',
        name: getReasonPhrase(StatusCodes.BAD_REQUEST),
        res,
        status_code: StatusCodes.BAD_REQUEST,
      });
    }

    const decode_hash_pass = bcrypt.compareSync(
      password,
      user_is_exist.password,
    );

    if (!decode_hash_pass) {
      try {
        await Promise.all([
          await limiter_slow_brute_by_ip.consume(ip_add),
          await limiter_consecutive_fails_by_email_and_ip.consume(
            `${ip_add}_${email}`,
          ),
        ]);
      } catch (error) {
        if (is_rate_limiter_res(error)) {
          res.set(
            'Retry-After',
            String(Math.round(error.msBeforeNext / 1000)) || '1',
          );
          return response_helper({
            message: 'Too many requests. Please try again later.',
            name: getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
            status_code: StatusCodes.TOO_MANY_REQUESTS,
            res,
          });
        }
        throw error;
      }
      return response_helper({
        message: 'Wrong Credential',
        res,
        status_code: StatusCodes.UNAUTHORIZED,
        name: getReasonPhrase(StatusCodes.UNAUTHORIZED),
      });
    }

    if (res_email_and_ip !== null && res_email_and_ip.consumedPoints > 0) {
      await limiter_consecutive_fails_by_email_and_ip.delete(
        `${ip_add}_${email}`,
      );
    }

    const token = await gen_jwt({ user: { id: user_is_exist.id } });
    const decode = (await jwt.decode(token)) as { exp: number };

    response_helper({
      status_code: StatusCodes.CREATED,
      name: getReasonPhrase(StatusCodes.CREATED),
      message: 'User Sign in successfully',
      res,
      data: {
        user: { id: user_is_exist.id, name: user_is_exist.name, email },
        token,
        expireAt: decode.exp * 1000,
      },
    });
  },
);
