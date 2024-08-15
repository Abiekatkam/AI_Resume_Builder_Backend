import { Router } from "express";
import passport from 'passport';
import verifyJWT from "../middlewares/auth.middleware.js"

import { successGoogleLogin, failureGoogleLogin , protectedRoute} from '../controllers/google.auth.controller.js';

const router = Router();

// Initialize Passport middleware
router.use(passport.initialize());

// Auth route to start Google OAuth flow
router.get('/auth/google', 
    passport.authenticate('google', { scope: ['email', 'profile'], session: false })
);

// Callback route for Google to redirect to
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/failure', session: false }),
    successGoogleLogin
);

// Success and failure routes
router.get('/success', successGoogleLogin);
router.get('/failure', failureGoogleLogin);
router.get('/protectedRoute', verifyJWT, protectedRoute)

export default router;
