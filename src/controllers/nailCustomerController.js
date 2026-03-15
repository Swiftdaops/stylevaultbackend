import NailAppointment from '../models/NailAppointment.js';
import NailCustomer from '../models/NailCustomer.js';
import { emitNailTechnicianUpdate } from '../socket/index.js';

export const getNailCustomers = async (req, res) => {
  try {
    const customers = await NailCustomer.find({ nailTechnicianId: req.user.nailTechnicianId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNailCustomer = async (req, res) => {
  try {
    const customer = await NailCustomer.findOne({ _id: req.params.id, nailTechnicianId: req.user.nailTechnicianId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNailCustomer = async (req, res) => {
  try {
    const customer = await NailCustomer.findOneAndUpdate(
      { _id: req.params.id, nailTechnicianId: req.user.nailTechnicianId },
      req.body,
      { new: true }
    );

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await NailAppointment.updateMany(
      { nailTechnicianId: req.user.nailTechnicianId, customerId: customer._id },
      {
        ...(req.body.name ? { customerName: req.body.name } : {}),
        ...(req.body.email ? { customerEmail: req.body.email } : {}),
      }
    );

    emitNailTechnicianUpdate(req.user.nailTechnicianId, {
      type: 'customer',
      action: 'updated',
      customerId: customer._id.toString(),
    });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
