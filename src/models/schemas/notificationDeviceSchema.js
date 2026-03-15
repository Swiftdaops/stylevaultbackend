import mongoose from 'mongoose';

const notificationDeviceSchema = new mongoose.Schema({
  token: { type: String, trim: true, default: '' },
  permission: {
    type: String,
    enum: ['default', 'granted', 'denied', 'unsupported'],
    default: 'default',
  },
  userAgent: { type: String, default: '' },
  platform: { type: String, default: '' },
  language: { type: String, default: '' },
  scope: { type: String, default: '' },
  subscribedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
}, { _id: false });

export default notificationDeviceSchema;