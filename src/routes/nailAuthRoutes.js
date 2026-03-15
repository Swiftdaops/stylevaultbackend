import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  changeNailTechnicianPassword,
  checkNailTechnicianEmailAvailability,
  getMeNailTechnician,
  loginNailTechnician,
  logoutNailTechnician,
  registerNailTechnician,
} from '../controllers/nailAuthController.js';

const router = express.Router();

router.get('/check-email', checkNailTechnicianEmailAvailability);
router.post('/register', registerNailTechnician);
router.post('/login', loginNailTechnician);
router.post('/logout', logoutNailTechnician);
router.get('/me', authMiddleware, getMeNailTechnician);
router.patch('/password', authMiddleware, changeNailTechnicianPassword);

export default router;
