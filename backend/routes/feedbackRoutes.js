const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { authMiddleware, ownerMiddleware, adminOrStaffMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// ═══════════════════════════════════════════════════════════════════
//  FEEDBACK ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/feedback — submit feedback (with duplicate check + vehicle auto-populate)
router.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating)
      return res.status(400).json({ message: 'bookingId and rating are required.' });

    // Prevent duplicate feedback for same booking
    const existing = await Feedback.findOne({ booking: bookingId, user: req.user.id });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this booking.' });

    // Auto-populate vehicle from booking
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const feedback = await Feedback.create({
      booking: bookingId,
      user:    req.user.id,
      vehicle: booking.vehicle,
      rating,
      comment,
    });
    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ message: 'Error submitting feedback.', error: err.message });
  }
});

// POST /api/feedback/:id/upload-photo — Upload a photo to a feedback review (max 3)
router.post('/api/feedback/:id/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const feedback = await Feedback.findOne({ _id: req.params.id, user: req.user.id });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found.' });
    if (feedback.photos && feedback.photos.length >= 3)
      return res.status(400).json({ message: 'Maximum 3 photos per review.' });
    feedback.photos = [...(feedback.photos || []), `/uploads/${req.file.filename}`];
    await feedback.save();
    res.json({ message: 'Photo uploaded.', feedback });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading photo.', error: err.message });
  }
});

// GET /api/feedback/my — get current user's submitted feedback
router.get('/api/feedback/my', authMiddleware, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ user: req.user.id })
      .populate('vehicle', 'makeAndModel imageUrl licensePlate')
      .populate('booking', 'startDate endDate')
      .sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your feedback.', error: err.message });
  }
});

// GET /api/vehicles/:id/feedback — public reviews for a vehicle
router.get('/api/vehicles/:id/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ vehicle: req.params.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    
    // Compute average rating
    const avg = feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
      : null;

    res.json({ feedbacks, averageRating: avg ? parseFloat(avg) : null, totalReviews: feedbacks.length });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicle feedback.', error: err.message });
  }
});

// GET /api/owner/feedback — all reviews across owner's vehicles
router.get('/api/owner/feedback', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const ownerVehicles = await Vehicle.find({ owner: req.user.id }).select('_id makeAndModel');
    const vehicleIds = ownerVehicles.map(v => v._id);

    const feedbacks = await Feedback.find({ vehicle: { $in: vehicleIds } })
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate')
      .sort({ createdAt: -1 });

    const avg = feedbacks.length > 0
      ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
      : null;

    res.json({ feedbacks, averageRating: avg ? parseFloat(avg) : null, totalReviews: feedbacks.length, vehicles: ownerVehicles });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching owner feedback.', error: err.message });
  }
});

// PATCH /api/owner/feedback/:id/reply — owner replies to a review
router.patch('/api/owner/feedback/:id/reply', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Reply text is required.' });

    const feedback = await Feedback.findById(req.params.id).populate('vehicle', 'owner');
    if (!feedback) return res.status(404).json({ message: 'Feedback not found.' });

    // Verify the owner actually owns this vehicle
    if (feedback.vehicle.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'You can only reply to feedback on your own vehicles.' });

    feedback.ownerReply = { text: text.trim(), repliedAt: new Date() };
    await feedback.save();
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: 'Error posting reply.', error: err.message });
  }
});

module.exports = router;
