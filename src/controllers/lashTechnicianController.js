import LashAppointment from '../models/LashAppointment.js';
import LashCustomer from '../models/LashCustomer.js';
import LashService from '../models/LashService.js';
import LashTechnician from '../models/LashTechnician.js';
import { emitLashTechnicianUpdate } from '../socket/index.js';
import { sanitizeProfileUpdates } from '../utils/profileOptions.js';

export const getLashTechnicians = async (req, res) => {
  try {
    const lashTechnicians = await LashTechnician.find().sort({ createdAt: -1 });
    res.json(lashTechnicians);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLashTechnician = async (req, res) => {
  try {
    const lashTechnician = await LashTechnician.create(req.body);
    res.status(201).json(lashTechnician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLashTechnician = async (req, res) => {
  try {
    const lashTechnician = await LashTechnician.findById(req.params.id);
    if (!lashTechnician) return res.status(404).json({ message: 'Lash technician not found' });
    res.json(lashTechnician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLashTechnician = async (req, res) => {
  const id = req.user?.lashTechnicianId;
  const updates = sanitizeProfileUpdates(req.body);

  try {
    if (!id) return res.status(400).json({ message: 'Lash technician id is required' });

    const lashTechnician = await LashTechnician.findByIdAndUpdate(id, updates, { new: true });
    if (!lashTechnician) return res.status(404).json({ message: 'Lash technician not found' });

    emitLashTechnicianUpdate(id, { type: 'profile', action: 'updated' });
    res.json(lashTechnician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLashAnalytics = async (req, res) => {
  const id = req.user?.lashTechnicianId;

  try {
    if (!id) return res.status(400).json({ message: 'Lash technician id is required' });

    const appointments = await LashAppointment.find({ lashTechnicianId: id });
    const totalRevenue = appointments.reduce((sum, appointment) => sum + (appointment.price || 0), 0);
    const popularServices = await LashService.find({ lashTechnicianId: id }).sort({ bookingsCount: -1 });
    const totalCustomers = await LashCustomer.countDocuments({ lashTechnicianId: id });

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
