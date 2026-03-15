import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getMeMakeupArtist,
  loginMakeupArtist,
  logoutMakeupArtist,
  registerMakeupArtist,
} from '../controllers/makeupAuthController.js';

const router = express.Router();

router.post('/register', registerMakeupArtist);
router.post('/login', loginMakeupArtist);
router.post('/logout', logoutMakeupArtist);
router.get('/me', authMiddleware, getMeMakeupArtist);

export default router;
