const axios = require('axios');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ── Notification Helper ────────────────────────────────────────────────
const sendNotification = async (userId, title, message, type = 'info', linkTo = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const notif = await Notification.create({ user: userId, title, message, type, linkTo });

    if (user.expoPushToken) {
      await axios.post('https://exp.host/--/api/v2/push/send', {
        to: user.expoPushToken,
        title,
        body: message,
        data: { linkTo, notificationId: notif._id }
      }, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        }
      });
    }
  } catch (err) {
    console.log('Failed to send push notification:', err.message);
  }
};

module.exports = sendNotification;
