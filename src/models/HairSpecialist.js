import mongoose from 'mongoose';

const hairSpecialistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  bio: { type: String },
  profileImage: { type: String },
  location: { type: String },
  country: { type: String, trim: true },
  whatsapp: { type: String, trim: true },
  socialLinks: {
    whatsapp: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    tiktok: { type: String, trim: true },
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true },
  },
  currency: { type: String, default: 'USD' },
  workingHours: { type: Object, default: {} },
  specialties: { type: [String], default: [] },
  subscriptionPlan: { type: String, enum: ['free', 'pro'], default: 'free' },
}, { timestamps: true });

export default mongoose.model('HairSpecialist', hairSpecialistSchema);
