import { StatusCodes } from 'http-status-codes';
import { logger } from '../config/winston_config';
import { RateLimiterRes } from 'rate-limiter-flexible';

class base_error extends Error {
  public readonly name: string;
  public readonly http_status_code: StatusCodes;
  public readonly is_operational: boolean;

  constructor(
    name: string,
    http_status_code: StatusCodes,
    description: string,
    is_operational: boolean,
  ) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.http_status_code = http_status_code;
    this.is_operational = is_operational;

    Error.captureStackTrace(this);
  }
}

export class api_error extends base_error {
  constructor(
    name: string,
    http_status_code: StatusCodes.INTERNAL_SERVER_ERROR,
    description: 'Internal Server Error',
    is_operational: true,
  ) {
    super(name, http_status_code, description, is_operational);
  }
}

class error_handler_class {
  public async handle_error(err: Error): Promise<void> {
    await logger.error(
      'Error message from the centralized error-handling component',
      err,
    );
  }

  public is_trusted_error(err: Error) {
    if (err instanceof base_error) {
      return err.is_operational;
    }

    return false;
  }
}

export const is_rate_limiter_res = (obj: any): obj is RateLimiterRes => {
  return (
    obj &&
    typeof obj === 'object' &&
    'msBeforeNext' in obj &&
    'consumedPoints' in obj
  );
};

export const error_handler = new error_handler_class();
