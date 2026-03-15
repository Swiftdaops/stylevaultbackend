// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = {
      id: user._id,
      role: user.role,
      barberId: user.barberId,
      hairSpecialistId: user.hairSpecialistId,
      nailTechnicianId: user.nailTechnicianId,
      lashTechnicianId: user.lashTechnicianId,
      makeupArtistId: user.makeupArtistId,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default authMiddleware;