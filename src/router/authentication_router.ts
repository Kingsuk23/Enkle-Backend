import { Router } from 'express';
import { validate_user_input } from '../middleware/validate_user_input';
import {
  sign_in_schema,
  sign_up_schema,
} from '../schema/authentication_validation';
import {
  sign_in_controller,
  sign_up_controller,
} from '../controllers/authentication_controller';

const route = Router();

route.post('/signup', validate_user_input(sign_up_schema), sign_up_controller);
route.post('/signin', validate_user_input(sign_in_schema), sign_in_controller);

export default route;
