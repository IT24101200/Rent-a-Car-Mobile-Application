const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { uploadKycFiles } = require('../middleware/uploadMiddleware');
const sendNotification = require('../helpers/sendNotification');

// ═══════════════════════════════════════════════════════════════════
//  USER & IDENTITY (KYC) ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/users/push-token — Register Expo Push Token
router.post('/api/users/push-token', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.expoPushToken = req.body.token;
    await user.save();
    
    res.json({ message: 'Push token updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/notifications — Get User's Notifications
router.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// PATCH /api/notifications/:id/read — Mark Notification as Read
router.patch('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/users/kyc — upload Identity documents for verification
router.post('/api/users/kyc', authMiddleware, uploadKycFiles, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const files = req.files || {};
    user.identity = user.identity || {};
    
    if (files['dlFront'] && files['dlFront'][0]) user.identity.dlFront = `/uploads/${files['dlFront'][0].filename}`;
    if (files['dlBack'] && files['dlBack'][0])   user.identity.dlBack  = `/uploads/${files['dlBack'][0].filename}`;
    if (files['nic'] && files['nic'][0])         user.identity.nic     = `/uploads/${files['nic'][0].filename}`;
    if (files['selfie'] && files['selfie'][0])   user.identity.selfie  = `/uploads/${files['selfie'][0].filename}`;
    
    // Automatically switch state to pending verification so admins can see it
    user.identity.status = 'pending';
    await user.save();
    
    // Notify all admins of the new KYC submission
    const admins = await User.find({ role: 'Admin' });
    for (const admin of admins) {
      await sendNotification(
        admin._id,
        'New KYC Submission',
        `${user.name} has submitted their Identity documents for verification.`,
        'info',
        'UserManagement'
      );
    }
    
    res.json({ message: 'KYC documents submitted.', identity: user.identity });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading KYC documents.', error: err.message });
  }
});

// PATCH /api/admin/users/:id/kyc — manually toggle user KYC status from Admin dashboard
router.patch('/api/admin/users/:id/kyc', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    
    const { status } = req.body;
    if (!['unverified', 'pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid KYC status parameter.' });
    }
    
    user.identity = user.identity || {};
    user.identity.status = status;
    await user.save();
    
    res.json({ message: `Successfully changed user KYC status to ${status}.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating KYC status.', error: err.message });
  }
});

module.exports = router;
