import User from '../models/User.js';

const MAX_NOTIFICATION_TOKENS = 10;

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

    nextTokens.push({
      token,
      userAgent: req.get('user-agent') || '',
      lastSeenAt: new Date(),
    });

    user.notificationTokens = nextTokens.slice(-MAX_NOTIFICATION_TOKENS);
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
