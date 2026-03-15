import mongoose from 'mongoose';
import notificationDeviceSchema from './schemas/notificationDeviceSchema.js';

const lashCustomerSchema = new mongoose.Schema({
  lashTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'LashTechnician', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  notificationSubscriptions: { type: [notificationDeviceSchema], default: [] },
  visitHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LashAppointment' }],
}, { timestamps: true });

export default mongoose.model('LashCustomer', lashCustomerSchema);
