import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getNailCustomer,
  getNailCustomers,
  updateNailCustomer,
} from '../controllers/nailCustomerController.js';

const router = express.Router();

router.get('/', authMiddleware, getNailCustomers);
router.get('/:id', authMiddleware, getNailCustomer);
router.patch('/:id', authMiddleware, updateNailCustomer);

export default router;
