import type { NextFunction, Request, response, Response } from 'express';
import z, { ZodError } from 'zod';
import { response_helper } from '../utils/utils';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

export const validate_user_input = (schema: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const error_message = error.issues.map((issue: any) => ({
          message: `${issue.message}`,
        }));

        return response_helper({
          message: error_message,
          name: getReasonPhrase(StatusCodes.BAD_REQUEST),
          res,
          status_code: StatusCodes.BAD_REQUEST,
        });
      }
      next(error);
    }
  };
};
