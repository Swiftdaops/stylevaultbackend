import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createMakeupService,
  deleteMakeupService,
  getMakeupServices,
  getMyMakeupServices,
  updateMakeupService,
} from '../controllers/makeupServiceController.js';

const router = express.Router();

router.post('/', authMiddleware, createMakeupService);
router.get('/manage', authMiddleware, getMyMakeupServices);
router.get('/', getMakeupServices);
router.patch('/:id', authMiddleware, updateMakeupService);
router.delete('/:id', authMiddleware, deleteMakeupService);

export default router;
