import type { NextFunction, Request, Response } from 'express';
import { api_error, error_handler } from '../utils/error_handler';
import { response_helper } from '../utils/utils';

export const centralized_error_handler = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!error_handler.is_trusted_error) {
    next(err);
  }

  await error_handler.handle_error(err);

  response_helper({
    res,
    message: (err as api_error).message,
    name: (err as api_error).name,
    status_code: (err as api_error).http_status_code,
  });
};

export const try_catch_handler =
  (func: (req: Request, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      Promise.resolve(func(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
