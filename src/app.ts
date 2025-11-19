import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import signup_route from './router/authentication_router';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['POST', 'PUT', 'DELETE', 'GET'],
  }),
);

app.use('/api/v1/auth', signup_route);

export default app;
