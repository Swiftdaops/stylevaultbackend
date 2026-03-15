// src/routes/authRoutes.js
import express from 'express';
import { register, login, logout, getMe, checkEmailAvailability, changePassword } from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/check-email', checkEmailAvailability);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);
router.patch('/password', authMiddleware, changePassword);

export default router;