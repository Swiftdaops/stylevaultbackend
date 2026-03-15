import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getMeNailTechnician,
  loginNailTechnician,
  logoutNailTechnician,
  registerNailTechnician,
} from '../controllers/nailAuthController.js';

const router = express.Router();

router.post('/register', registerNailTechnician);
router.post('/login', loginNailTechnician);
router.post('/logout', logoutNailTechnician);
router.get('/me', authMiddleware, getMeNailTechnician);

export default router;
