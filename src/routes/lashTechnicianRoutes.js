import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createLashTechnician,
  getLashAnalytics,
  getLashTechnician,
  getLashTechnicians,
  updateLashTechnician,
} from '../controllers/lashTechnicianController.js';

const router = express.Router();

router.get('/', getLashTechnicians);
router.post('/', authMiddleware, createLashTechnician);
router.patch('/', authMiddleware, updateLashTechnician);
router.get('/:id', getLashTechnician);
router.patch('/:id', authMiddleware, updateLashTechnician);
router.get('/:id/analytics', authMiddleware, getLashAnalytics);

export default router;
