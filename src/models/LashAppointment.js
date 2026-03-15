import mongoose from 'mongoose';

const lashAppointmentSchema = new mongoose.Schema({
  lashTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'LashTechnician', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LashService', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'LashCustomer', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  managementToken: { type: String, index: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  selectedPricingOption: { type: String },
  selectedAddOns: { type: [String], default: [] },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
}, { timestamps: true });

lashAppointmentSchema.index({ lashTechnicianId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model('LashAppointment', lashAppointmentSchema);
