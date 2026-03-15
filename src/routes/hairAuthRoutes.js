import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  changeHairSpecialistPassword,
  checkHairSpecialistEmailAvailability,
  getMeHairSpecialist,
  loginHairSpecialist,
  logoutHairSpecialist,
  registerHairSpecialist,
} from '../controllers/hairAuthController.js';

const router = express.Router();

router.get('/check-email', checkHairSpecialistEmailAvailability);
router.post('/register', registerHairSpecialist);
router.post('/login', loginHairSpecialist);
router.post('/logout', logoutHairSpecialist);
router.get('/me', authMiddleware, getMeHairSpecialist);
router.patch('/password', authMiddleware, changeHairSpecialistPassword);

export default router;
