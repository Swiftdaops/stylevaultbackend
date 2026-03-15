import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import MakeupArtist from '../models/MakeupArtist.js';
import User from '../models/User.js';
import { getAuthCookieOptions } from '../utils/authCookies.js';
import { changeAccountPassword, findUserByNormalizedEmail, normalizeEmailAddress } from '../utils/authAccount.js';
import { buildTakenBrandResponse, findExistingBrand } from '../utils/brandIdentity.js';
import { mergeWhatsappSocialLink, normalizeCountryCode, resolveCurrencyInput } from '../utils/profileOptions.js';

const generateToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const registerMakeupArtist = async (req, res) => {
  const { name, email, password, slug, location, bio, specialties = [], whatsapp, country, currency } = req.body;

  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const existingUser = await findUserByNormalizedEmail(normalizedEmail);
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const { normalizedName, normalizedSlug, existingName, existingSlug } = await findExistingBrand(MakeupArtist, { name, slug });
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
    const makeupArtist = await MakeupArtist.create({
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
      role: 'makeup-artist',
      makeupArtistId: makeupArtist._id,
    });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);
    res.status(201).json({ user: { email: normalizedEmail, role: user.role }, makeupArtist });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json(buildTakenBrandResponse({ name, slug, existingSlug: true }));
    }

    res.status(500).json({ message: error.message });
  }
};

export const loginMakeupArtist = async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const user = await User.findOne({ email: normalizedEmail, role: 'makeup-artist' });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    const cookieOptions = getAuthCookieOptions(req);

    res.cookie('token', token, cookieOptions);

    const makeupArtist = await MakeupArtist.findById(user.makeupArtistId);
    res.json({ user: { email: normalizedEmail, role: user.role }, makeupArtist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkMakeupArtistEmailAvailability = async (req, res) => {
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

export const logoutMakeupArtist = (req, res) => {
  const cookieOptions = getAuthCookieOptions(req);

  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
};

export const getMeMakeupArtist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'makeup-artist') {
      return res.status(404).json({ message: 'Makeup artist not found' });
    }

    const makeupArtist = await MakeupArtist.findById(user.makeupArtistId);
    res.json({ user: { email: user.email, role: user.role }, makeupArtist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changeMakeupArtistPassword = async (req, res) => {
  try {
    await changeAccountPassword({
      userId: req.user.id,
      role: 'makeup-artist',
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
