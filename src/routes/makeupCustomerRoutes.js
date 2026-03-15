import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getMakeupCustomer,
  getMakeupCustomers,
  updateMakeupCustomer,
} from '../controllers/makeupCustomerController.js';

const router = express.Router();

router.get('/', authMiddleware, getMakeupCustomers);
router.get('/:id', authMiddleware, getMakeupCustomer);
router.patch('/:id', authMiddleware, updateMakeupCustomer);

export default router;
