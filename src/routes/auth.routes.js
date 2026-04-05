import express from 'express';
import { register, login, verifyEmail } from '../controllers/auth.controller.js';
import { validate, registerSchema, loginSchema, verifyEmailSchema } from '../validations/auth.validation.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);

export default router;
