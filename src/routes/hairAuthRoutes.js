import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getMeHairSpecialist,
  loginHairSpecialist,
  logoutHairSpecialist,
  registerHairSpecialist,
} from '../controllers/hairAuthController.js';

const router = express.Router();

router.post('/register', registerHairSpecialist);
router.post('/login', loginHairSpecialist);
router.post('/logout', logoutHairSpecialist);
router.get('/me', authMiddleware, getMeHairSpecialist);

export default router;
