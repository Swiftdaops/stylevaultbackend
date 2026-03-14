import mongoose from 'mongoose';

const hairCustomerSchema = new mongoose.Schema({
  hairSpecialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairSpecialist', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  visitHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HairAppointment' }],
}, { timestamps: true });

export default mongoose.model('HairCustomer', hairCustomerSchema);
