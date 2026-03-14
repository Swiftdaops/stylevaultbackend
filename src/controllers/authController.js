// src/controllers/authController.js
import User from '../models/User.js';
import Barber from '../models/Barber.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getAuthCookieOptions } from '../utils/authCookies.js';
import { mergeWhatsappSocialLink, normalizeCountryCode, resolveCurrencyInput } from '../utils/profileOptions.js';

const generateToken = (barber) => {
  return jwt.sign({ id: barber._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register new barber
export const register = async (req, res) => {
  const { name, email, password, slug, whatsapp, country, currency } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedCountry = normalizeCountryCode(country);
    const resolvedCurrency = resolveCurrencyInput({ currency, country: normalizedCountry });
    const barber = await Barber.create({
      name,
      slug,
      whatsapp,
      country: normalizedCountry || undefined,
      currency: resolvedCurrency,
      socialLinks: mergeWhatsappSocialLink({}, whatsapp),
    });
    const user = await User.create({ email, password: hashedPassword, role: 'barber', barberId: barber._id });

    const token = generateToken(user);
    res.cookie('token', token, getAuthCookieOptions(req));
    res.status(201).json({ user: { email, role: user.role }, barber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login barber
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.cookie('token', token, getAuthCookieOptions(req));

    const barber = await Barber.findById(user.barberId);
    res.json({ user: { email, role: user.role }, barber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout
export const logout = (req, res) => {
  res.clearCookie('token', getAuthCookieOptions(req));
  res.json({ message: 'Logged out successfully' });
};

// Get current logged-in barber
export const getMe = async (req, res) => {
  const userId = req.user.id; // set by auth middleware
  try {
    const user = await User.findById(userId);
    const barber = await Barber.findById(user.barberId);
    res.json({ user: { email: user.email, role: user.role }, barber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};