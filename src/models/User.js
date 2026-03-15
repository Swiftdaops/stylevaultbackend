// src/models/User.js
import mongoose from 'mongoose';
import notificationDeviceSchema from './schemas/notificationDeviceSchema.js';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['barber', 'hair-specialist', 'nail-technician', 'lash-technician', 'makeup-artist', 'admin'], default: 'barber' },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber' },
  hairSpecialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairSpecialist' },
  nailTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'NailTechnician' },
  lashTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'LashTechnician' },
  makeupArtistId: { type: mongoose.Schema.Types.ObjectId, ref: 'MakeupArtist' },
  notificationTokens: { type: [notificationDeviceSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('User', userSchema);