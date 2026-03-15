import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getLashCustomer,
  getLashCustomers,
  updateLashCustomer,
} from '../controllers/lashCustomerController.js';

const router = express.Router();

router.get('/', authMiddleware, getLashCustomers);
router.get('/:id', authMiddleware, getLashCustomer);
router.patch('/:id', authMiddleware, updateLashCustomer);

export default router;
