import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  changeLashTechnicianPassword,
  checkLashTechnicianEmailAvailability,
  getMeLashTechnician,
  loginLashTechnician,
  logoutLashTechnician,
  registerLashTechnician,
} from '../controllers/lashAuthController.js';

const router = express.Router();

router.get('/check-email', checkLashTechnicianEmailAvailability);
router.post('/register', registerLashTechnician);
router.post('/login', loginLashTechnician);
router.post('/logout', logoutLashTechnician);
router.get('/me', authMiddleware, getMeLashTechnician);
router.patch('/password', authMiddleware, changeLashTechnicianPassword);

export default router;
