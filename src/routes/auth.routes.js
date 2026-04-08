import express from 'express';
import { register, login, verifyEmail, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { validate, registerSchema, loginSchema, verifyEmailSchema, updateProfileSchema } from '../validations/auth.validation.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.get('/me', requireAuth, getProfile);
router.patch('/me', requireAuth, validate(updateProfileSchema), updateProfile);

export default router;
