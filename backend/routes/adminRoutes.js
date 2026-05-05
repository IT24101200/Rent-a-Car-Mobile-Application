const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const Report = require('../models/Report');
const User = require('../models/User');
const { authMiddleware, adminMiddleware, adminOrStaffMiddleware } = require('../middleware/authMiddleware');
const { upload, uploadVehicleFiles } = require('../middleware/uploadMiddleware');

// ═══════════════════════════════════════════════════════════════════
//  ADMIN & STAFF ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/admin/users
router.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'Admin' } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: 'Error fetching users.', error: err.message }); }
});

// PATCH /api/admin/users/:id/status
router.patch('/api/admin/users/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: 'Error updating user status.', error: err.message }); }
});

// PATCH /api/admin/users/:id/kyc
router.patch('/api/admin/users/:id/kyc', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected', 'pending', 'unverified'].includes(status)) return res.status(400).json({ message: 'Invalid KYC status.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.identity = user.identity || {};
    user.identity.status = status;
    await user.save();
    res.json({ message: `KYC status updated to ${status}.`, user });
  } catch (err) { res.status(500).json({ message: 'Error updating KYC status.', error: err.message }); }
});

// PATCH /api/admin/users/:id/role
router.patch('/api/admin/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'Admin') return res.status(400).json({ message: 'Invalid role assignment.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: 'Error updating user role.', error: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) { res.status(500).json({ message: 'Error deleting user.', error: err.message }); }
});

// GET /api/admin/bookings
router.get('/api/admin/bookings', authMiddleware, adminOrStaffMiddleware(['bookings', 'bookings-readonly']), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: 'Error fetching bookings.', error: err.message }); }
});

// PATCH /api/admin/bookings/:id/force-cancel
router.patch('/api/admin/bookings/:id/force-cancel', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: 'Error cancelling booking.', error: err.message }); }
});

// PATCH /api/admin/bookings/:id/status
router.patch('/api/admin/bookings/:id/status', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'active', 'returning', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status. Valid: ' + validStatuses.join(', ') });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const oldStatus = booking.status;
    booking.status = status;
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      booking.refundStatus = 'pending';
      booking.cancellationReason = booking.cancellationReason || 'Cancelled by Booking Manager';
    }
    await booking.save();
    const populated = await Booking.findById(booking._id).populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner');
    res.json({ message: `Status changed: ${oldStatus} → ${status}`, booking: populated });
  } catch (err) { res.status(500).json({ message: 'Error updating booking status.', error: err.message }); }
});

// PATCH /api/admin/bookings/:id/reschedule
router.patch('/api/admin/bookings/:id/reschedule', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate required.' });
    const start = new Date(startDate); const end = new Date(endDate);
    if (end <= start) return res.status(400).json({ message: 'End date must be after start date.' });
    const booking = await Booking.findById(req.params.id).populate('vehicle', 'pricePerDay');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (['completed', 'cancelled'].includes(booking.status)) return res.status(400).json({ message: 'Cannot reschedule a ' + booking.status + ' booking.' });
    const conflict = await Booking.findOne({ _id: { $ne: booking._id }, vehicle: booking.vehicle._id, status: { $nin: ['cancelled'] }, startDate: { $lt: end }, endDate: { $gt: start } });
    if (conflict) return res.status(409).json({ message: 'Date conflict with another booking.' });
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    booking.startDate = start; booking.endDate = end;
    booking.totalPrice = days * (booking.vehicle.pricePerDay || 0);
    await booking.save();
    const populated = await Booking.findById(booking._id).populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner');
    res.json({ message: `Rescheduled. New total: Rs.${booking.totalPrice}`, booking: populated });
  } catch (err) { res.status(500).json({ message: 'Error rescheduling.', error: err.message }); }
});

// PATCH /api/admin/bookings/:id/refund
router.patch('/api/admin/bookings/:id/refund', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const { refundStatus } = req.body;
    if (!['none', 'pending', 'issued'].includes(refundStatus)) return res.status(400).json({ message: 'Invalid refundStatus.' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    booking.refundStatus = refundStatus;
    await booking.save();
    const populated = await Booking.findById(booking._id).populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner');
    res.json({ message: 'Refund status: ' + refundStatus, booking: populated });
  } catch (err) { res.status(500).json({ message: 'Error updating refund.', error: err.message }); }
});

// DELETE /api/admin/bookings/:id
router.delete('/api/admin/bookings/:id', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (!['cancelled', 'completed'].includes(booking.status)) return res.status(400).json({ message: 'Only cancelled/completed bookings can be deleted.' });
    await Booking.findByIdAndDelete(req.params.id);
    await Feedback.deleteMany({ booking: req.params.id });
    res.json({ message: 'Booking record deleted.' });
  } catch (err) { res.status(500).json({ message: 'Error deleting booking.', error: err.message }); }
});

// GET /api/admin/vehicles
router.get('/api/admin/vehicles', authMiddleware, adminOrStaffMiddleware(['fleet', 'validation']), async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('owner', 'name email').populate('validatedBy', 'name').sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) { res.status(500).json({ message: 'Error fetching fleet.', error: err.message }); }
});

// PATCH /api/admin/vehicles/:id
router.patch('/api/admin/vehicles/:id', authMiddleware, adminOrStaffMiddleware(['fleet']), uploadVehicleFiles, async (req, res) => {
  try {
    const { pricePerDay, features, isAvailable } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const files = req.files || {};
    const newPrice = pricePerDay ? Number(pricePerDay) : vehicle.pricePerDay;
    const isPriceDecrease = newPrice < vehicle.pricePerDay;
    if (isPriceDecrease) {
      if (!(files.priceJustification && files.priceJustification[0])) return res.status(400).json({ message: 'A justification document is required to decrease the vehicle price.' });
      vehicle.priceProposal = { proposedPrice: newPrice, proposedBy: 'admin', justificationDoc: `/uploads/${files.priceJustification[0].filename}`, status: 'pending', createdAt: Date.now() };
    } else if (newPrice !== vehicle.pricePerDay) { vehicle.pricePerDay = newPrice; vehicle.priceUpdatedAt = Date.now(); }
    if (features !== undefined) vehicle.features = features;
    if (isAvailable !== undefined) vehicle.isAvailable = isAvailable === 'true' || isAvailable === true;
    await vehicle.save();
    const populated = await Vehicle.findById(vehicle._id).populate('owner', 'name email');
    res.json({ message: isPriceDecrease ? 'Price decrease proposed to owner.' : 'Vehicle updated.', vehicle: populated });
  } catch (err) { res.status(500).json({ message: 'Error updating vehicle.', error: err.message }); }
});

// PATCH /api/admin/vehicles/:id/price-proposal
router.patch('/api/admin/vehicles/:id/price-proposal', authMiddleware, adminOrStaffMiddleware(['fleet']), async (req, res) => {
  try {
    const { action } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    if (!vehicle.priceProposal || vehicle.priceProposal.status !== 'pending' || vehicle.priceProposal.proposedBy !== 'owner') return res.status(400).json({ message: 'No pending price proposal from owner found.' });
    if (action === 'approve') { vehicle.pricePerDay = vehicle.priceProposal.proposedPrice; vehicle.priceUpdatedAt = Date.now(); vehicle.priceProposal.status = 'approved'; } else { vehicle.priceProposal.status = 'rejected'; }
    await vehicle.save();
    vehicle.priceProposal = undefined;
    await vehicle.save();
    res.json({ message: `Price proposal ${action}d.`, vehicle });
  } catch (err) { res.status(500).json({ message: 'Error resolving proposal.', error: err.message }); }
});

// PATCH /api/admin/payments/:id/status
router.patch('/api/admin/payments/:id/status', authMiddleware, adminOrStaffMiddleware(['finance', 'payments']), async (req, res) => {
  try {
    const { action } = req.body;
    const booking = await Booking.findById(req.params.id).populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (action === 'approve') { booking.paymentStatus = 'paid'; booking.status = 'confirmed'; }
    else if (action === 'reject') { booking.paymentStatus = 'rejected'; booking.status = 'cancelled'; booking.cancellationReason = 'Payment rejected by administrator.'; }
    else return res.status(400).json({ message: 'Invalid action.' });
    await booking.save();
    res.json({ message: `Payment ${action}d successfully.`, booking });
  } catch (err) { res.status(500).json({ message: 'Error updating payment status.', error: err.message }); }
});

// DELETE /api/admin/vehicles/:id
router.delete('/api/admin/vehicles/:id', authMiddleware, adminOrStaffMiddleware(['fleet']), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const activeBookings = await Booking.countDocuments({ vehicle: req.params.id, status: { $in: ['confirmed', 'active', 'returning'] } });
    if (activeBookings > 0) return res.status(400).json({ message: `Cannot delete — ${activeBookings} active booking(s) exist.` });
    await Feedback.deleteMany({ vehicle: req.params.id });
    await Booking.deleteMany({ vehicle: req.params.id, status: { $in: ['cancelled', 'completed'] } });
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle and related records deleted.' });
  } catch (err) { res.status(500).json({ message: 'Error deleting vehicle.', error: err.message }); }
});

// PATCH /api/admin/vehicles/:id/validation-note
router.patch('/api/admin/vehicles/:id/validation-note', authMiddleware, adminOrStaffMiddleware(['validation']), async (req, res) => {
  try {
    const { validationNote } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    vehicle.validationNote = validationNote || '';
    await vehicle.save();
    const populated = await Vehicle.findById(vehicle._id).populate('owner', 'name email').populate('validatedBy', 'name');
    res.json({ message: 'Validation note updated.', vehicle: populated });
  } catch (err) { res.status(500).json({ message: 'Error updating note.', error: err.message }); }
});

// GET /api/admin/payments
router.get('/api/admin/payments', authMiddleware, adminOrStaffMiddleware(['payments']), async (req, res) => {
  try {
    const bookings = await Booking.find().populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate type').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: 'Error fetching payments.', error: err.message }); }
});

// PATCH /api/admin/payments/:id/refund
router.patch('/api/admin/payments/:id/refund', authMiddleware, adminOrStaffMiddleware(['payments']), async (req, res) => {
  try {
    const { refundStatus } = req.body;
    if (!['none', 'pending', 'issued'].includes(refundStatus)) return res.status(400).json({ message: 'Invalid refund status.' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    booking.refundStatus = refundStatus;
    if (refundStatus === 'issued') booking.paymentStatus = 'refunded';
    else if (refundStatus === 'none') booking.paymentStatus = 'paid';
    await booking.save();
    const populated = await Booking.findById(booking._id).populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate type');
    res.json({ message: `Refund ${refundStatus}.`, booking: populated });
  } catch (err) { res.status(500).json({ message: 'Error updating refund.', error: err.message }); }
});

// GET /api/admin/feedback
router.get('/api/admin/feedback', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try {
    const feedback = await Feedback.find().populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate')
      .populate({ path: 'booking', populate: { path: 'vehicle', select: 'makeAndModel licensePlate' } }).sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) { res.status(500).json({ message: 'Error fetching feedback.', error: err.message }); }
});

// DELETE /api/admin/feedback/:id
router.delete('/api/admin/feedback/:id', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try { await Feedback.findByIdAndDelete(req.params.id); res.json({ message: 'Feedback removed successfully.' }); }
  catch (err) { res.status(500).json({ message: 'Error removing feedback.', error: err.message }); }
});

// PATCH /api/admin/feedback/:id/flag
router.patch('/api/admin/feedback/:id/flag', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: 'Feedback not found.' });
    fb.flagged = !fb.flagged; await fb.save();
    const populated = await Feedback.findById(fb._id).populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate').populate({ path: 'booking', populate: { path: 'vehicle', select: 'makeAndModel licensePlate' } });
    res.json({ message: `Feedback ${fb.flagged ? 'flagged' : 'unflagged'}.`, feedback: populated });
  } catch (err) { res.status(500).json({ message: 'Error toggling flag.', error: err.message }); }
});

// PATCH /api/admin/feedback/:id/note
router.patch('/api/admin/feedback/:id/note', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try {
    const { adminNote } = req.body;
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: 'Feedback not found.' });
    fb.adminNote = adminNote || ''; await fb.save();
    const populated = await Feedback.findById(fb._id).populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate').populate({ path: 'booking', populate: { path: 'vehicle', select: 'makeAndModel licensePlate' } });
    res.json({ message: 'Admin note updated.', feedback: populated });
  } catch (err) { res.status(500).json({ message: 'Error updating note.', error: err.message }); }
});

module.exports = router;
