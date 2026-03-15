import MakeupAppointment from '../models/MakeupAppointment.js';
import MakeupCustomer from '../models/MakeupCustomer.js';
import { emitMakeupArtistUpdate } from '../socket/index.js';

export const getMakeupCustomers = async (req, res) => {
  try {
    const customers = await MakeupCustomer.find({ makeupArtistId: req.user.makeupArtistId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMakeupCustomer = async (req, res) => {
  try {
    const customer = await MakeupCustomer.findOne({ _id: req.params.id, makeupArtistId: req.user.makeupArtistId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMakeupCustomer = async (req, res) => {
  try {
    const customer = await MakeupCustomer.findOneAndUpdate(
      { _id: req.params.id, makeupArtistId: req.user.makeupArtistId },
      req.body,
      { new: true }
    );

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await MakeupAppointment.updateMany(
      { makeupArtistId: req.user.makeupArtistId, customerId: customer._id },
      {
        ...(req.body.name ? { customerName: req.body.name } : {}),
        ...(req.body.email ? { customerEmail: req.body.email } : {}),
      }
    );

    emitMakeupArtistUpdate(req.user.makeupArtistId, {
      type: 'customer',
      action: 'updated',
      customerId: customer._id.toString(),
    });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
