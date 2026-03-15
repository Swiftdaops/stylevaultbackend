import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createMakeupArtist,
  getMakeupAnalytics,
  getMakeupArtist,
  getMakeupArtists,
  updateMakeupArtist,
} from '../controllers/makeupArtistController.js';

const router = express.Router();

router.get('/', getMakeupArtists);
router.post('/', authMiddleware, createMakeupArtist);
router.patch('/', authMiddleware, updateMakeupArtist);
router.get('/:id', getMakeupArtist);
router.patch('/:id', authMiddleware, updateMakeupArtist);
router.get('/:id/analytics', authMiddleware, getMakeupAnalytics);

export default router;
