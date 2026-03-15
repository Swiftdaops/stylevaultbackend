import mongoose from 'mongoose';

const nailCustomerSchema = new mongoose.Schema({
  nailTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'NailTechnician', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  visitHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NailAppointment' }],
}, { timestamps: true });

export default mongoose.model('NailCustomer', nailCustomerSchema);
