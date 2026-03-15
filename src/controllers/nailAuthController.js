import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import NailTechnician from '../models/NailTechnician.js';
import User from '../models/User.js';
import { getAuthCookieOptions } from '../utils/authCookies.js';
import { mergeWhatsappSocialLink, normalizeCountryCode, resolveCurrencyInput } from '../utils/profileOptions.js';

const generateToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const registerNailTechnician = async (req, res) => {
  const { name, email, password, slug, location, bio, specialties = [], whatsapp, country, currency } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const existingSlug = await NailTechnician.findOne({ slug });
    if (existingSlug) return res.status(400).json({ message: 'Slug already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedCountry = normalizeCountryCode(country);
    const resolvedCurrency = resolveCurrencyInput({ currency, country: normalizedCountry });
    const nailTechnician = await NailTechnician.create({
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
      role: 'nail-technician',
      nailTechnicianId: nailTechnician._id,
    });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);
    res.status(201).json({ user: { email, role: user.role }, nailTechnician });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginNailTechnician = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: 'nail-technician' });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);

    const nailTechnician = await NailTechnician.findById(user.nailTechnicianId);
    res.json({ user: { email, role: user.role }, nailTechnician });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutNailTechnician = (req, res) => {
  const cookieOptions = getAuthCookieOptions(req);

  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
};

export const getMeNailTechnician = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'nail-technician') {
      return res.status(404).json({ message: 'Nail technician not found' });
    }

    const nailTechnician = await NailTechnician.findById(user.nailTechnicianId);
    res.json({ user: { email: user.email, role: user.role }, nailTechnician });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
