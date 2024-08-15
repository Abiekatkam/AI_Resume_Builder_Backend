import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import userRoute from './routes/user.router.js';
import emailRoute from './routes/email.router.js';
import googleRoute from './routes/google.auth.Route.js';
import passport from './auth.utils/passport.js';

import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

app.options('*', cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

// Initialize passport
app.use(passport.initialize());

app.use('/api/v1', googleRoute);
app.use('/api/v1/users', userRoute);
app.use('/api/v1/email', emailRoute);

export default app;
