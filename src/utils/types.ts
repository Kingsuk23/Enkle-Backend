import { Response } from 'express';

export type response_helper_props = {
  res: Response;
  status_code: number;
  name: string;
  message: string | unknown;
  data?: any;
  error?: unknown;
};
