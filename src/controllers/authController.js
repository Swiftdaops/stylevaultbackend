// src/controllers/authController.js
import User from '../models/User.js';
import Barber from '../models/Barber.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getAuthCookieOptions } from '../utils/authCookies.js';
import { changeAccountPassword, findUserByNormalizedEmail, normalizeEmailAddress } from '../utils/authAccount.js';
import { buildTakenBrandResponse, findExistingBrand } from '../utils/brandIdentity.js';
import { mergeWhatsappSocialLink, normalizeCountryCode, resolveCurrencyInput } from '../utils/profileOptions.js';

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register new barber
export const register = async (req, res) => {
  const { name, email, password, slug, whatsapp, country, currency } = req.body;
  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const existingUser = await findUserByNormalizedEmail(normalizedEmail);
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const { normalizedName, normalizedSlug, existingName, existingSlug } = await findExistingBrand(Barber, { name, slug });
    if (!normalizedName || !normalizedSlug) {
      return res.status(400).json({ field: 'name', message: 'Brand name is required' });
    }
    if (existingName || existingSlug) {
      return res.status(400).json(buildTakenBrandResponse({
        name: normalizedName,
        slug: normalizedSlug,
        existingName,
        existingSlug,
      }));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedCountry = normalizeCountryCode(country);
    const resolvedCurrency = resolveCurrencyInput({ currency, country: normalizedCountry });
    const barber = await Barber.create({
      name: normalizedName,
      slug: normalizedSlug,
      whatsapp,
      country: normalizedCountry || undefined,
      currency: resolvedCurrency,
      socialLinks: mergeWhatsappSocialLink({}, whatsapp),
    });
    const user = await User.create({ email: normalizedEmail, password: hashedPassword, role: 'barber', barberId: barber._id });

    const token = generateToken(user);
    res.cookie('token', token, getAuthCookieOptions(req));
    res.status(201).json({ user: { email: normalizedEmail, role: user.role }, barber });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json(buildTakenBrandResponse({ name, slug, existingSlug: true }));
    }

    res.status(500).json({ message: error.message });
  }
};

// Login barber
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const user = await User.findOne({ email: normalizedEmail, role: 'barber' });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.cookie('token', token, getAuthCookieOptions(req));

    const barber = await Barber.findById(user.barberId);
    res.json({ user: { email: normalizedEmail, role: user.role }, barber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkEmailAvailability = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmailAddress(req.query?.email || req.body?.email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const existingUser = await findUserByNormalizedEmail(normalizedEmail);

    res.json({
      available: !existingUser,
      message: existingUser ? 'Email is already registered' : 'Email is available',
    });
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
    if (!user || user.role !== 'barber') {
      return res.status(404).json({ message: 'Barber not found' });
    }

    const barber = await Barber.findById(user.barberId);
    res.json({ user: { email: user.email, role: user.role }, barber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    await changeAccountPassword({
      userId: req.user.id,
      role: 'barber',
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};