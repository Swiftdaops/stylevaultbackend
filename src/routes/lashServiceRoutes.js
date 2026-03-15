import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createLashService,
  deleteLashService,
  getLashServices,
  getMyLashServices,
  updateLashService,
} from '../controllers/lashServiceController.js';

const router = express.Router();

router.post('/', authMiddleware, createLashService);
router.get('/manage', authMiddleware, getMyLashServices);
router.get('/', getLashServices);
router.patch('/:id', authMiddleware, updateLashService);
router.delete('/:id', authMiddleware, deleteLashService);

export default router;
