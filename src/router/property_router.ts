import { Router } from 'express';
import { get_all_properties_controller } from '../controllers/property_controller';

const route = Router();

route.get('/properties', get_all_properties_controller);

export default route;
