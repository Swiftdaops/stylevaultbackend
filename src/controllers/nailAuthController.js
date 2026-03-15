import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import NailTechnician from '../models/NailTechnician.js';
import User from '../models/User.js';
import { getAuthCookieOptions } from '../utils/authCookies.js';
import { changeAccountPassword, findUserByNormalizedEmail, normalizeEmailAddress } from '../utils/authAccount.js';
import { buildTakenBrandResponse, findExistingBrand } from '../utils/brandIdentity.js';
import { mergeWhatsappSocialLink, normalizeCountryCode, resolveCurrencyInput } from '../utils/profileOptions.js';

const generateToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const registerNailTechnician = async (req, res) => {
  const { name, email, password, slug, location, bio, specialties = [], whatsapp, country, currency } = req.body;

  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const existingUser = await findUserByNormalizedEmail(normalizedEmail);
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const { normalizedName, normalizedSlug, existingName, existingSlug } = await findExistingBrand(NailTechnician, { name, slug });
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
    const nailTechnician = await NailTechnician.create({
      name: normalizedName,
      slug: normalizedSlug,
      location,
      whatsapp,
      country: normalizedCountry || undefined,
      currency: resolvedCurrency,
      bio,
      specialties: Array.isArray(specialties) ? specialties : [],
      socialLinks: mergeWhatsappSocialLink({}, whatsapp),
    });

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: 'nail-technician',
      nailTechnicianId: nailTechnician._id,
    });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);
    res.status(201).json({ user: { email: normalizedEmail, role: user.role }, nailTechnician });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json(buildTakenBrandResponse({ name, slug, existingSlug: true }));
    }

    res.status(500).json({ message: error.message });
  }
};

export const loginNailTechnician = async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const user = await User.findOne({ email: normalizedEmail, role: 'nail-technician' });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);

    const nailTechnician = await NailTechnician.findById(user.nailTechnicianId);
    res.json({ user: { email: normalizedEmail, role: user.role }, nailTechnician });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkNailTechnicianEmailAvailability = async (req, res) => {
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

export const changeNailTechnicianPassword = async (req, res) => {
  try {
    await changeAccountPassword({
      userId: req.user.id,
      role: 'nail-technician',
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
