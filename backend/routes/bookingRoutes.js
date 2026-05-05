const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const { authMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const sendNotification = require('../helpers/sendNotification');

// ═══════════════════════════════════════════════════════════════════
//  BOOKING ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/bookings  — create a booking (requires auth, pure JSON)
router.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { vehicleId, startDate, endDate, totalPrice, paymentMethod } = req.body;
    if (!vehicleId || !startDate || !endDate || !totalPrice)
      return res.status(400).json({ message: 'vehicleId, startDate, endDate and totalPrice are required.' });


    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (start >= end)
      return res.status(400).json({ message: 'Drop-off date/time must be strictly after pick-up date/time.' });
      
    // Enforce 1 hour future buffer
    const oneHourFromNow = new Date(Date.now() + 55 * 60 * 1000); // 55 mins to allow for slight UI delays
    if (start < oneHourFromNow)
      return res.status(400).json({ message: 'Bookings must start at least 1 hour from the current time.' });

    // Validate vehicle is active and approved
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    if (vehicle.validationStatus !== 'accepted')
      return res.status(400).json({ message: 'This vehicle is not approved for booking.' });
    if (!vehicle.isAvailable)
      return res.status(400).json({ message: 'This vehicle is currently unavailable.' });

    // ── Overlap Check (Exact Time-based) ────────────────────────
    const conflict = await Booking.findOne({
      vehicle: vehicleId,
      status: { $in: ['confirmed', 'active', 'returning'] },
      $or: [
        { startDate: { $lt: end },  endDate: { $gt: start } }, // overlap condition
      ],
    });
    if (conflict) {
      return res.status(409).json({
        message: `This vehicle is already booked from ${new Date(conflict.startDate).toLocaleDateString()} to ${new Date(conflict.endDate).toLocaleDateString()}. Please choose different dates.`
      });
    }

    const booking = await Booking.create({
      vehicle:   vehicleId,
      user:      req.user.id,
      startDate: start,
      endDate:   end,
      totalPrice,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentMethod === 'bank_transfer' ? 'pending' : 'paid',
      status:        paymentMethod === 'bank_transfer' ? 'pending' : 'confirmed',
    });
    res.status(201).json(booking);
  } catch (err) {
    console.error('[POST /api/bookings] Error:', err.message);
    res.status(500).json({ message: 'Error creating booking.', error: err.message });
  }
});

// POST /api/bookings/:id/upload-slip — Upload payment slip after booking is created
router.post('/api/bookings/:id/upload-slip', authMiddleware, upload.single('paymentSlip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded. Please select an image.' });
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { paymentSlip: `/uploads/${req.file.filename}` },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Payment slip uploaded successfully.', booking });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading payment slip.', error: err.message });
  }
});

// GET /api/bookings/my  — get current user's bookings
router.get('/api/bookings/my', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay imageUrl')
      .sort({ createdAt: -1 });
      
    // Fetch all feedbacks given by this user
    const feedbacks = await Feedback.find({ user: req.user.id }).select('booking');
    const feedbackBookingIds = feedbacks.map(f => f.booking.toString());

    // Attach hasReviewed to each booking
    const bookingsWithReviewStatus = bookings.map(b => ({
      ...b.toObject(),
      hasReviewed: feedbackBookingIds.includes(b._id.toString())
    }));

    res.json(bookingsWithReviewStatus);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings.', error: err.message });
  }
});

// PATCH /api/bookings/:id/cancel — cancel an upcoming trip (Customer)
router.patch('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found or unauthorized.' });
    if (booking.status !== 'confirmed') return res.status(400).json({ message: 'Only confirmed bookings can be cancelled.' });
    
    // Only allow cancellation if start date is in the future
    if (new Date(booking.startDate) <= new Date()) {
      return res.status(400).json({ message: 'Cannot cancel a trip that has already started.' });
    }

    booking.status = 'cancelled';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error cancelling booking.', error: err.message });
  }
});

// PATCH /api/bookings/:id/reschedule — reschedule an upcoming trip (Customer)
router.patch('/api/bookings/:id/reschedule', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, totalPrice } = req.body;
    if (!startDate || !endDate || !totalPrice)
      return res.status(400).json({ message: 'startDate, endDate and totalPrice are required.' });

    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found or unauthorized.' });
    if (booking.status !== 'confirmed') return res.status(400).json({ message: 'Only confirmed bookings can be rescheduled.' });

    if (new Date(booking.startDate) <= new Date()) {
      return res.status(400).json({ message: 'Cannot reschedule a trip that has already started.' });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (start >= end) return res.status(400).json({ message: 'Drop-off date/time must be strictly after pick-up date/time.' });
    
    // Enforce 1 hour future buffer
    const oneHourFromNow = new Date(Date.now() + 55 * 60 * 1000); // 55 mins tolerance
    if (start < oneHourFromNow) return res.status(400).json({ message: 'Rescheduled bookings must start at least 1 hour from now.' });

    // ── Overlap Check (Exact Time-based + Excluding This Booking)
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      vehicle: booking.vehicle,
      status: { $in: ['confirmed', 'active', 'returning'] },
      $or: [
        { startDate: { $lt: end },  endDate: { $gt: start } },
      ],
    });
    
    if (conflict) {
      return res.status(409).json({
        message: `This vehicle is already booked from ${new Date(conflict.startDate).toLocaleDateString()} to ${new Date(conflict.endDate).toLocaleDateString()}. Please choose different dates.`
      });
    }

    booking.startDate = start;
    booking.endDate = end;
    booking.totalPrice = totalPrice;
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error rescheduling booking.', error: err.message });
  }
});

// PATCH /api/bookings/:id/checkin — Customer starts trip
router.patch('/api/bookings/:id/checkin', authMiddleware, upload.single('conditionPhoto'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'confirmed') return res.status(400).json({ message: 'Only confirmed trips can be started.' });

    // Ensure it's not starting too early (standard: 30 minutes grace period)
    const thirtyMinsBefore = new Date(booking.startDate.getTime() - 30 * 60 * 1000);
    if (new Date() < thirtyMinsBefore) {
      return res.status(400).json({ message: 'You can only check-in up to 30 minutes before your trip starts.' });
    }

    booking.status = 'active';
    booking.checkInDetails = {
      odometer: req.body.odometer || 0,
      conditionPhoto: req.file ? `/uploads/${req.file.filename}` : null,
      time: new Date()
    };

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Check-in failed.', error: err.message });
  }
});

// PATCH /api/bookings/:id/checkout — Customer finishes trip
router.patch('/api/bookings/:id/checkout', authMiddleware, upload.single('conditionPhoto'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id }).populate('vehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'active') return res.status(400).json({ message: 'Trip is not active.' });

    const now = new Date();
    
    // Check for late return (Option A: 2 hours grace period)
    const msLate = now.getTime() - new Date(booking.endDate).getTime();
    if (msLate > 2 * 60 * 60 * 1000) { // If late by more than 2 hours
      const extraDaysToCharge = Math.ceil(msLate / (24 * 60 * 60 * 1000));
      const penalty = extraDaysToCharge * (booking.vehicle.pricePerDay || 0);
      
      booking.additionalCharges = (booking.additionalCharges || 0) + penalty;
      booking.paymentStatus = 'pending_extra_payment';

      // Send penalty notification
      await sendNotification(
        booking.user,
        'Late Penalty Applied',
        `Your trip was returned ${extraDaysToCharge} day(s) late. A penalty of Rs. ${penalty.toLocaleString()} has been added.`,
        'penalty'
      );
    }

    booking.status = 'returning';
    booking.checkOutDetails = {
      odometer: req.body.odometer || 0,
      conditionPhoto: req.file ? `/uploads/${req.file.filename}` : null,
      time: now
    };

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Check-out failed.', error: err.message });
  }
});

// PATCH /api/bookings/:id/extend — Customer proactively extends trip
router.patch('/api/bookings/:id/extend', authMiddleware, async (req, res) => {
  try {
    const { newEndDate } = req.body;
    if (!newEndDate) return res.status(400).json({ message: 'New end date is required.' });

    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id }).populate('vehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'active') return res.status(400).json({ message: 'Trip is not active.' });

    const requestedEnd = new Date(newEndDate);
    if (requestedEnd <= new Date(booking.endDate)) {
      return res.status(400).json({ message: 'New end date must be after the current end date.' });
    }

    // Check availability against other bookings.
    const conflicting = await Booking.findOne({
      vehicle: booking.vehicle._id,
      status: { $in: ['confirmed', 'active'] },
      _id: { $ne: booking._id },
      startDate: { $lt: requestedEnd },
      endDate: { $gt: booking.endDate }
    });

    if (conflicting) {
      return res.status(400).json({ message: 'Vehicle is already booked for the requested extension period.' });
    }

    // Calculate extra days and cost
    const msExtra = requestedEnd.getTime() - new Date(booking.endDate).getTime();
    const extraDays = Math.ceil(msExtra / (24 * 60 * 60 * 1000));
    const extraCost = extraDays * (booking.vehicle.pricePerDay || 0);

    booking.endDate = requestedEnd;
    booking.additionalCharges = (booking.additionalCharges || 0) + extraCost;
    booking.paymentStatus = 'pending_extra_payment';

    await booking.save();

    await sendNotification(
      booking.user,
      'Trip Extended',
      `Your trip has been extended until ${requestedEnd.toLocaleString([], {dateStyle:'medium', timeStyle:'short'})}. Estimated extra charge: Rs. ${extraCost.toLocaleString()}.`,
      'success'
    );

    res.json({ message: 'Booking extended successfully. Please pay the additional balance.', booking });
  } catch (err) {
    res.status(500).json({ message: 'Extension failed.', error: err.message });
  }
});

// PATCH /api/owner/bookings/:id/verify — Owner completes trip
router.patch('/api/owner/bookings/:id/verify', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id }).populate('vehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    
    // Verify Ownership
    if (booking.vehicle.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized. Not your vehicle.' });
    }

    if (booking.status !== 'returning') return res.status(400).json({ message: 'Trip must be in returning state.' });

    booking.status = 'completed';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Verification failed.', error: err.message });
  }
});

module.exports = router;
