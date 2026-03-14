import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import HairSpecialist from '../models/HairSpecialist.js';
import User from '../models/User.js';
import { mergeWhatsappSocialLink, normalizeCountryCode, resolveCurrencyInput } from '../utils/profileOptions.js';

const generateToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const registerHairSpecialist = async (req, res) => {
  const { name, email, password, slug, location, bio, specialties = [], whatsapp, country, currency } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const existingSlug = await HairSpecialist.findOne({ slug });
    if (existingSlug) return res.status(400).json({ message: 'Slug already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedCountry = normalizeCountryCode(country);
    const resolvedCurrency = resolveCurrencyInput({ currency, country: normalizedCountry });
    const hairSpecialist = await HairSpecialist.create({
      name,
      slug,
      location,
      whatsapp,
      country: normalizedCountry || undefined,
      currency: resolvedCurrency,
      bio,
      specialties: Array.isArray(specialties) ? specialties : [],
      socialLinks: mergeWhatsappSocialLink({}, whatsapp),
    });

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'hair-specialist',
      hairSpecialistId: hairSpecialist._id,
    });

    const token = generateToken(user);

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.status(201).json({ user: { email, role: user.role }, hairSpecialist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginHairSpecialist = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: 'hair-specialist' });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    const hairSpecialist = await HairSpecialist.findById(user.hairSpecialistId);
    res.json({ user: { email, role: user.role }, hairSpecialist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutHairSpecialist = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

export const getMeHairSpecialist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'hair-specialist') {
      return res.status(404).json({ message: 'Hair specialist not found' });
    }

    const hairSpecialist = await HairSpecialist.findById(user.hairSpecialistId);
    res.json({ user: { email: user.email, role: user.role }, hairSpecialist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
