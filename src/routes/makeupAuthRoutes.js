import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  changeMakeupArtistPassword,
  checkMakeupArtistEmailAvailability,
  getMeMakeupArtist,
  loginMakeupArtist,
  logoutMakeupArtist,
  registerMakeupArtist,
} from '../controllers/makeupAuthController.js';

const router = express.Router();

router.get('/check-email', checkMakeupArtistEmailAvailability);
router.post('/register', registerMakeupArtist);
router.post('/login', loginMakeupArtist);
router.post('/logout', logoutMakeupArtist);
router.get('/me', authMiddleware, getMeMakeupArtist);
router.patch('/password', authMiddleware, changeMakeupArtistPassword);

export default router;
