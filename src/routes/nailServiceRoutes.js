import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createNailService,
  deleteNailService,
  getMyNailServices,
  getNailServices,
  updateNailService,
} from '../controllers/nailServiceController.js';

const router = express.Router();

router.post('/', authMiddleware, createNailService);
router.get('/manage', authMiddleware, getMyNailServices);
router.get('/', getNailServices);
router.patch('/:id', authMiddleware, updateNailService);
router.delete('/:id', authMiddleware, deleteNailService);

export default router;
