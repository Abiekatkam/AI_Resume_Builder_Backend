import express from 'express';
import cors from 'cors';
import userRoute from './routes/user.router.js';
import openAiRoute from './routes/openAi.router.js'
import resumeRoute from './routes/resume.router.js';
import feedback from './routes/feedback.router.js'

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

app.use('/api/v1/users', userRoute);
app.use('/api/v1/openAi', openAiRoute);
app.use('/api/v1/resume', resumeRoute);
app.use('/api/v1/feedback', feedback);


export default app;
