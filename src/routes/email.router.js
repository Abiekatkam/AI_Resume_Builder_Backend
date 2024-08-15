// email.router.js
import { Router } from 'express';
import { sendEmailController } from '../controllers/email.controller.js';

const router = Router();

router.post('/sendemail', sendEmailController);

export default router;
