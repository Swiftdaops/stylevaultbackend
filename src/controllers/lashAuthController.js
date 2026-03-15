import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import LashTechnician from '../models/LashTechnician.js';
import User from '../models/User.js';
import { getAuthCookieOptions } from '../utils/authCookies.js';
import { mergeWhatsappSocialLink, normalizeCountryCode, resolveCurrencyInput } from '../utils/profileOptions.js';

const generateToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const registerLashTechnician = async (req, res) => {
  const { name, email, password, slug, location, bio, specialties = [], whatsapp, country, currency } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const existingSlug = await LashTechnician.findOne({ slug });
    if (existingSlug) return res.status(400).json({ message: 'Slug already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedCountry = normalizeCountryCode(country);
    const resolvedCurrency = resolveCurrencyInput({ currency, country: normalizedCountry });
    const lashTechnician = await LashTechnician.create({
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
      role: 'lash-technician',
      lashTechnicianId: lashTechnician._id,
    });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);
    res.status(201).json({ user: { email, role: user.role }, lashTechnician });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginLashTechnician = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: 'lash-technician' });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);

    const lashTechnician = await LashTechnician.findById(user.lashTechnicianId);
    res.json({ user: { email, role: user.role }, lashTechnician });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutLashTechnician = (req, res) => {
  const cookieOptions = getAuthCookieOptions(req);

  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
};

export const getMeLashTechnician = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'lash-technician') {
      return res.status(404).json({ message: 'Lash technician not found' });
    }

    const lashTechnician = await LashTechnician.findById(user.lashTechnicianId);
    res.json({ user: { email: user.email, role: user.role }, lashTechnician });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
