// src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['barber', 'admin'], default: 'barber' },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);