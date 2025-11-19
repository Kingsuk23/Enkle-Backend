import { response_helper_props } from './types';
import jwt from 'jsonwebtoken';

export const response_helper = ({
  message,
  res,
  status_code,
  data,
  name,
  error,
}: response_helper_props) => {
  return res.status(status_code).json({
    status: name,
    message,
    data,
    error,
  });
};

export const gen_jwt = async (data: unknown) => {
  return await jwt.sign({ data }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};
