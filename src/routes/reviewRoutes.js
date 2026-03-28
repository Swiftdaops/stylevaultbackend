import express from 'express';
import { listPublicReviews } from '../controllers/reviewController.js';

const router = express.Router();

router.get('/', listPublicReviews);

export default router;
