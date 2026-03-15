import User from '../models/User.js';
import { upsertNotificationDeviceEntries } from '../utils/notificationDevices.js';

const MAX_NOTIFICATION_TOKENS = 10;

const buildDevicePayload = (req) => ({
  token: req.body?.token,
  permission: req.body?.permission,
  platform: req.body?.platform,
  language: req.body?.language,
  scope: req.body?.scope,
});

export const saveDevicePreference = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.notificationTokens = upsertNotificationDeviceEntries(
      user.notificationTokens,
      buildDevicePayload(req),
      { req, maxItems: MAX_NOTIFICATION_TOKENS }
    );

    await user.save();

    res.json({
      message: 'Notification preference saved',
      count: Array.isArray(user.notificationTokens) ? user.notificationTokens.length : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const registerDeviceToken = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Device token is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.updateMany(
      {
        _id: { $ne: user._id },
        'notificationTokens.token': token,
      },
      {
        $pull: {
          notificationTokens: { token },
        },
      }
    );

    const nextTokens = Array.isArray(user.notificationTokens)
      ? user.notificationTokens.filter((entry) => entry?.token !== token)
      : [];

    user.notificationTokens = upsertNotificationDeviceEntries(
      nextTokens,
      {
        ...buildDevicePayload(req),
        token,
        permission: req.body?.permission || 'granted',
      },
      { req, maxItems: MAX_NOTIFICATION_TOKENS }
    );
    await user.save();

    res.json({
      message: 'Device token registered',
      count: user.notificationTokens.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unregisterDeviceToken = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Device token is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: {
          notificationTokens: { token },
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Device token removed',
      count: Array.isArray(user.notificationTokens) ? user.notificationTokens.length : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
