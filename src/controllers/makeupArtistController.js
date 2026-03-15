import MakeupAppointment from '../models/MakeupAppointment.js';
import MakeupCustomer from '../models/MakeupCustomer.js';
import MakeupService from '../models/MakeupService.js';
import MakeupArtist from '../models/MakeupArtist.js';
import { emitMakeupArtistUpdate } from '../socket/index.js';
import { sanitizeProfileUpdates } from '../utils/profileOptions.js';

export const getMakeupArtists = async (req, res) => {
  try {
    const makeupArtists = await MakeupArtist.find().sort({ createdAt: -1 });
    res.json(makeupArtists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMakeupArtist = async (req, res) => {
  try {
    const makeupArtist = await MakeupArtist.create(req.body);
    res.status(201).json(makeupArtist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMakeupArtist = async (req, res) => {
  try {
    const makeupArtist = await MakeupArtist.findById(req.params.id);
    if (!makeupArtist) return res.status(404).json({ message: 'Makeup artist not found' });
    res.json(makeupArtist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMakeupArtist = async (req, res) => {
  const id = req.user?.makeupArtistId;
  const updates = sanitizeProfileUpdates(req.body);

  try {
    if (!id) return res.status(400).json({ message: 'Makeup artist id is required' });

    const makeupArtist = await MakeupArtist.findByIdAndUpdate(id, updates, { new: true });
    if (!makeupArtist) return res.status(404).json({ message: 'Makeup artist not found' });

    emitMakeupArtistUpdate(id, { type: 'profile', action: 'updated' });
    res.json(makeupArtist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMakeupAnalytics = async (req, res) => {
  const id = req.user?.makeupArtistId;

  try {
    if (!id) return res.status(400).json({ message: 'Makeup artist id is required' });

    const appointments = await MakeupAppointment.find({ makeupArtistId: id });
    const totalRevenue = appointments.reduce((sum, appointment) => sum + (appointment.price || 0), 0);
    const popularServices = await MakeupService.find({ makeupArtistId: id }).sort({ bookingsCount: -1 });
    const totalCustomers = await MakeupCustomer.countDocuments({ makeupArtistId: id });

    res.json({
      totalRevenue,
      totalAppointments: appointments.length,
      totalCustomers,
      popularServices,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
