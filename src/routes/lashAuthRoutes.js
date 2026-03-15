import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getMeLashTechnician,
  loginLashTechnician,
  logoutLashTechnician,
  registerLashTechnician,
} from '../controllers/lashAuthController.js';

const router = express.Router();

router.post('/register', registerLashTechnician);
router.post('/login', loginLashTechnician);
router.post('/logout', logoutLashTechnician);
router.get('/me', authMiddleware, getMeLashTechnician);

export default router;
