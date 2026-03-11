// src/models/Barber.js
import mongoose from 'mongoose';

const barberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  bio: { type: String },
  profileImage: { type: String },
  location: { type: String },
  currency: { type: String, default: 'USD' },
  workingHours: { type: Object, default: {} }, // e.g., { Monday: ["09:00","17:00"] }
  subscriptionPlan: { type: String, enum: ['free','pro'], default: 'free' },
}, { timestamps: true });

export default mongoose.model('Barber', barberSchema);