const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Report = require('../models/Report');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { authMiddleware, adminMiddleware, adminOrStaffMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// ═══════════════════════════════════════════════════════════════════
//  REPORT & STAFF ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/admin/reports — Create report with live data snapshot
router.post('/api/admin/reports', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    const { title, type, notes } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const [allBookings, allVehicles, allFeedbacks, allUsers] = await Promise.all([
      Booking.find().populate('vehicle', 'makeAndModel owner'), Vehicle.find(), Feedback.find().populate('vehicle', 'makeAndModel'), User.find(),
    ]);
    const totalRevenue = allBookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalPrice || 0), 0);
    const statusBreakdown = {};
    allBookings.forEach(b => { statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1; });
    const monthlyRevenue = []; const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en', { month: 'short' });
      const amount = allBookings.filter(b => { const bd = new Date(b.createdAt); return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear() && b.status !== 'cancelled'; }).reduce((s, b) => s + (b.totalPrice || 0), 0);
      monthlyRevenue.push({ label, amount });
    }
    const vehIncome = {};
    allBookings.filter(b => b.status !== 'cancelled').forEach(b => { if (b.vehicle) { const n = b.vehicle.makeAndModel || 'Unknown'; vehIncome[n] = (vehIncome[n] || 0) + (b.totalPrice || 0); } });
    const topEarners = Object.entries(vehIncome).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, income]) => ({ name, income }));
    const vehRatings = {};
    allFeedbacks.forEach(f => { if (f.vehicle) { const n = f.vehicle.makeAndModel || 'Unknown'; if (!vehRatings[n]) vehRatings[n] = []; vehRatings[n].push(f.rating); } });
    const topRated = Object.entries(vehRatings).map(([name, rs]) => ({ name, avg: parseFloat((rs.reduce((s, r) => s + r, 0) / rs.length).toFixed(1)), count: rs.length })).sort((a, b) => b.avg - a.avg).slice(0, 5);
    const ratingDist = [0, 0, 0, 0, 0];
    allFeedbacks.forEach(f => { if (f.rating >= 1 && f.rating <= 5) ratingDist[f.rating - 1]++; });
    const owners = allUsers.filter(u => u.role === 'Car Owner');
    const ownerPerformance = owners.map(o => {
      const oVehicles = allVehicles.filter(v => v.owner && v.owner.toString() === o._id.toString());
      const oVehicleIds = oVehicles.map(v => v._id.toString());
      const oBookings = allBookings.filter(b => b.vehicle && oVehicleIds.includes(b.vehicle._id ? b.vehicle._id.toString() : b.vehicle.toString()));
      const oFeedbacks = allFeedbacks.filter(f => f.vehicle && oVehicleIds.includes(f.vehicle._id ? f.vehicle._id.toString() : f.vehicle.toString()));
      return { name: o.name, email: o.email, vehicleCount: oVehicles.length, totalIncome: oBookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalPrice || 0), 0), avgRating: oFeedbacks.length > 0 ? parseFloat((oFeedbacks.reduce((s, f) => s + f.rating, 0) / oFeedbacks.length).toFixed(1)) : null };
    }).filter(o => o.vehicleCount > 0);
    const platformAvgRating = allFeedbacks.length > 0 ? parseFloat((allFeedbacks.reduce((s, f) => s + f.rating, 0) / allFeedbacks.length).toFixed(1)) : null;
    const report = await Report.create({ title, type: type || 'full', notes: notes || '', createdBy: req.user.id, snapshot: { totalRevenue, totalBookings: allBookings.length, totalVehicles: allVehicles.length, totalUsers: allUsers.length, platformAvgRating, totalReviews: allFeedbacks.length, statusBreakdown, topEarners, topRated, monthlyRevenue, ratingDist, ownerPerformance } });
    const populated = await Report.findById(report._id).populate('createdBy', 'name');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: 'Error creating report.', error: err.message }); }
});

// GET /api/admin/reports
router.get('/api/admin/reports', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try { const reports = await Report.find().populate('createdBy', 'name').sort({ createdAt: -1 }); res.json(reports); }
  catch (err) { res.status(500).json({ message: 'Error fetching reports.', error: err.message }); }
});

// GET /api/admin/reports/:id
router.get('/api/admin/reports/:id', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try { const report = await Report.findById(req.params.id).populate('createdBy', 'name'); if (!report) return res.status(404).json({ message: 'Report not found.' }); res.json(report); }
  catch (err) { res.status(500).json({ message: 'Error fetching report.', error: err.message }); }
});

// PATCH /api/admin/reports/:id
router.patch('/api/admin/reports/:id', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    const { title, notes } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (title) report.title = title; if (notes !== undefined) report.notes = notes;
    await report.save();
    const populated = await Report.findById(report._id).populate('createdBy', 'name');
    res.json({ message: 'Report updated.', report: populated });
  } catch (err) { res.status(500).json({ message: 'Error updating report.', error: err.message }); }
});

// DELETE /api/admin/reports/:id
router.delete('/api/admin/reports/:id', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try { await Report.findByIdAndDelete(req.params.id); res.json({ message: 'Report deleted.' }); }
  catch (err) { res.status(500).json({ message: 'Error deleting report.', error: err.message }); }
});

// POST /api/admin/reports/:id/upload-attachment
router.post('/api/admin/reports/:id/upload-attachment', authMiddleware, adminOrStaffMiddleware(['report']), upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    report.attachments = [...(report.attachments || []), { filename: req.file.originalname || req.file.filename, fileUrl: `/uploads/${req.file.filename}`, uploadedAt: new Date() }];
    await report.save();
    const populated = await Report.findById(report._id).populate('createdBy', 'name');
    res.json({ message: 'Attachment uploaded.', report: populated });
  } catch (err) { res.status(500).json({ message: 'Error uploading attachment.', error: err.message }); }
});

// DELETE /api/admin/reports/:id/attachments/:index
router.delete('/api/admin/reports/:id/attachments/:index', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0 || idx >= (report.attachments || []).length) return res.status(400).json({ message: 'Invalid attachment index.' });
    report.attachments.splice(idx, 1); await report.save();
    const populated = await Report.findById(report._id).populate('createdBy', 'name');
    res.json({ message: 'Attachment removed.', report: populated });
  } catch (err) { res.status(500).json({ message: 'Error removing attachment.', error: err.message }); }
});

// POST /api/admin/staff — Admin creates a new staff account
router.post('/api/admin/staff', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, password, staffRole } = req.body;
    const validRoles = ['Booking Manager', 'Feedback Manager', 'Vehicle Manager', 'Vehicle Validation Manager', 'Payment Manager', 'Report Handling Manager'];
    if (!name || !email || !password || !staffRole) return res.status(400).json({ message: 'Name, email, password, and staff role are required.' });
    if (!validRoles.includes(staffRole)) return res.status(400).json({ message: 'Invalid staff role.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email: email.toLowerCase(), password: hashedPassword, role: 'Staff', staffRole, status: 'active' });
    await user.save();
    res.status(201).json({ message: `Staff member "${name}" created as ${staffRole}.`, user: { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole } });
  } catch (err) { res.status(500).json({ message: 'Failed to create staff member.', error: err.message }); }
});

// PATCH /api/admin/users/:id/staff-role
router.patch('/api/admin/users/:id/staff-role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { staffRole } = req.body;
    const validRoles = ['Booking Manager', 'Feedback Manager', 'Vehicle Manager', 'Vehicle Validation Manager', 'Payment Manager', 'Report Handling Manager'];
    if (staffRole && !validRoles.includes(staffRole)) return res.status(400).json({ message: 'Invalid staff role.' });
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) return res.status(404).json({ message: 'User not found.' });
    if (existingUser.role === 'Car Owner') return res.status(400).json({ message: 'Cannot assign staff role to a Car Owner. Create a dedicated staff account instead.' });
    const update = staffRole ? { role: 'Staff', staffRole } : { role: 'Customer', staffRole: null };
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    res.json({ message: staffRole ? `User promoted to ${staffRole}.` : 'Staff role revoked.', user });
  } catch (err) { res.status(500).json({ message: 'Error updating staff role.', error: err.message }); }
});

module.exports = router;
