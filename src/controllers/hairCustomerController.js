import HairAppointment from '../models/HairAppointment.js';
import HairCustomer from '../models/HairCustomer.js';
import { emitHairSpecialistUpdate } from '../socket/index.js';

export const getHairCustomers = async (req, res) => {
  try {
    const customers = await HairCustomer.find({ hairSpecialistId: req.user.hairSpecialistId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHairCustomer = async (req, res) => {
  try {
    const customer = await HairCustomer.findOne({ _id: req.params.id, hairSpecialistId: req.user.hairSpecialistId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHairCustomer = async (req, res) => {
  try {
    const customer = await HairCustomer.findOneAndUpdate(
      { _id: req.params.id, hairSpecialistId: req.user.hairSpecialistId },
      req.body,
      { new: true }
    );

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await HairAppointment.updateMany(
      { hairSpecialistId: req.user.hairSpecialistId, customerId: customer._id },
      {
        ...(req.body.name ? { customerName: req.body.name } : {}),
        ...(req.body.email ? { customerEmail: req.body.email } : {}),
      }
    );

    emitHairSpecialistUpdate(req.user.hairSpecialistId, {
      type: 'customer',
      action: 'updated',
      customerId: customer._id.toString(),
    });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
