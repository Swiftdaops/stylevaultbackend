import mongoose from 'mongoose';

const makeupCustomerSchema = new mongoose.Schema({
  makeupArtistId: { type: mongoose.Schema.Types.ObjectId, ref: 'MakeupArtist', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  visitHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MakeupAppointment' }],
}, { timestamps: true });

export default mongoose.model('MakeupCustomer', makeupCustomerSchema);
