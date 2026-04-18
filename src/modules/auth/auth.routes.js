import { Router } from 'express';
import * as AuthController from './auth.controller.js';
import { validate } from '../../middleware/validator.js';
import { authGuard } from '../../middleware/authGuard.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import {
    registerValidation,
    loginValidation,
    completeProfileValidation,
} from './auth.validation.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerValidation), AuthController.register);
router.post('/login', authLimiter, validate(loginValidation), AuthController.login);

// Protected routes
router.get('/me', authGuard, AuthController.getMe);
router.get('/onboarding-data', authGuard, AuthController.getOnboardingData);
router.put('/complete-profile', authGuard, validate(completeProfileValidation), AuthController.completeProfile);
export default router;
