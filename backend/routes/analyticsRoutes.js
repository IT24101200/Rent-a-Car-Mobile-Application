const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { authMiddleware, ownerMiddleware, adminOrStaffMiddleware } = require('../middleware/authMiddleware');

// ═══════════════════════════════════════════════════════════════════
//  ANALYTICS & DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/owner/analytics — owner-level analytics
router.get('/api/owner/analytics', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const ownerVehicles = await Vehicle.find({ owner: req.user.id });
    const vehicleIds = ownerVehicles.map(v => v._id);

    const bookings = await Booking.find({ vehicle: { $in: vehicleIds } });
    const feedbacks = await Feedback.find({ vehicle: { $in: vehicleIds } });

    const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed' || b.status === 'active' || b.status === 'returning');
    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const avgRating = feedbacks.length > 0
      ? parseFloat((feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1))
      : null;

    // Per-vehicle breakdown
    const vehicleStats = ownerVehicles.map(v => {
      const vBookings = bookings.filter(b => b.vehicle.toString() === v._id.toString());
      const vFeedbacks = feedbacks.filter(f => f.vehicle.toString() === v._id.toString());
      const vCompleted = vBookings.filter(b => b.status === 'completed' || b.status === 'confirmed' || b.status === 'active' || b.status === 'returning');
      return {
        vehicleId: v._id,
        makeAndModel: v.makeAndModel,
        licensePlate: v.licensePlate,
        totalBookings: vBookings.length,
        totalIncome: vCompleted.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
        avgRating: vFeedbacks.length > 0
          ? parseFloat((vFeedbacks.reduce((s, f) => s + f.rating, 0) / vFeedbacks.length).toFixed(1))
          : null,
        reviewCount: vFeedbacks.length,
      };
    });

    // Monthly earnings (last 6 months)
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthBookings = completedBookings.filter(b => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === year && bd.getMonth() === month;
      });
      monthlyEarnings.push({
        label: d.toLocaleString('default', { month: 'short' }),
        amount: monthBookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
      });
    }

    res.json({
      totalEarnings,
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      activeVehicles: ownerVehicles.filter(v => v.validationStatus === 'accepted').length,
      totalVehicles: ownerVehicles.length,
      avgRating,
      totalReviews: feedbacks.length,
      vehicleStats,
      monthlyEarnings,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching owner analytics.', error: err.message });
  }
});

// GET /api/admin/analytics/report — full platform report
router.get('/api/admin/analytics/report', authMiddleware, adminOrStaffMiddleware(['analytics', 'report']), async (req, res) => {
  try {
    const [allBookings, allVehicles, allFeedbacks, allUsers] = await Promise.all([
      Booking.find().populate('vehicle', 'makeAndModel owner'),
      Vehicle.find().populate('owner', 'name email'),
      Feedback.find().populate('vehicle', 'makeAndModel'),
      User.find().select('name email role'),
    ]);

    // Revenue
    const revenueBookings = allBookings.filter(b => ['completed', 'confirmed', 'active', 'returning'].includes(b.status));
    const totalRevenue = revenueBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const mBookings = revenueBookings.filter(b => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === year && bd.getMonth() === month;
      });
      monthlyRevenue.push({
        label: d.toLocaleString('default', { month: 'short' }),
        amount: mBookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
      });
    }

    // Booking status breakdown
    const statusBreakdown = {
      confirmed: allBookings.filter(b => b.status === 'confirmed').length,
      active: allBookings.filter(b => b.status === 'active').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      returning: allBookings.filter(b => b.status === 'returning').length,
    };

    // Top 5 earning vehicles
    const vehicleEarnings = {};
    revenueBookings.forEach(b => {
      if (!b.vehicle) return;
      const vid = b.vehicle._id.toString();
      if (!vehicleEarnings[vid]) vehicleEarnings[vid] = { name: b.vehicle.makeAndModel, income: 0 };
      vehicleEarnings[vid].income += (b.totalPrice || 0);
    });
    const topEarners = Object.values(vehicleEarnings).sort((a, b) => b.income - a.income).slice(0, 5);

    // Top 5 rated vehicles
    const vehicleRatings = {};
    allFeedbacks.forEach(f => {
      if (!f.vehicle) return;
      const vid = f.vehicle._id.toString();
      if (!vehicleRatings[vid]) vehicleRatings[vid] = { name: f.vehicle.makeAndModel, total: 0, count: 0 };
      vehicleRatings[vid].total += f.rating;
      vehicleRatings[vid].count += 1;
    });
    const topRated = Object.values(vehicleRatings)
      .map(v => ({ ...v, avg: parseFloat((v.total / v.count).toFixed(1)) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    // Rating distribution (1-5 histogram)
    const ratingDist = [0, 0, 0, 0, 0];
    allFeedbacks.forEach(f => { if (f.rating >= 1 && f.rating <= 5) ratingDist[f.rating - 1]++; });

    // Owner performance
    const owners = allUsers.filter(u => u.role === 'Car Owner');
    const ownerPerformance = owners.map(o => {
      const oVehicles = allVehicles.filter(v => v.owner && v.owner._id.toString() === o._id.toString());
      const oVehicleIds = oVehicles.map(v => v._id.toString());
      const oBookings = revenueBookings.filter(b => b.vehicle && oVehicleIds.includes(b.vehicle._id.toString()));
      const oFeedbacks = allFeedbacks.filter(f => f.vehicle && oVehicleIds.includes(f.vehicle._id.toString()));
      return {
        name: o.name,
        email: o.email,
        vehicleCount: oVehicles.length,
        totalIncome: oBookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
        avgRating: oFeedbacks.length > 0
          ? parseFloat((oFeedbacks.reduce((s, f) => s + f.rating, 0) / oFeedbacks.length).toFixed(1))
          : null,
      };
    }).sort((a, b) => b.totalIncome - a.totalIncome);

    const platformAvgRating = allFeedbacks.length > 0
      ? parseFloat((allFeedbacks.reduce((s, f) => s + f.rating, 0) / allFeedbacks.length).toFixed(1))
      : null;

    res.json({
      totalRevenue,
      totalBookings: allBookings.length,
      totalVehicles: allVehicles.length,
      totalUsers: allUsers.length,
      statusBreakdown,
      monthlyRevenue,
      topEarners,
      topRated,
      ratingDist,
      ownerPerformance,
      platformAvgRating,
      totalReviews: allFeedbacks.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report.', error: err.message });
  }
});

// GET /api/analytics
router.get('/api/analytics', authMiddleware, adminOrStaffMiddleware(['analytics', 'report']), async (req, res) => {
  try {
    const [bookings, vehicles, cancelledCount] = await Promise.all([
      Booking.find(),
      Vehicle.find(),
      Booking.countDocuments({ status: 'cancelled' }),
    ]);

    const totalIncome      = bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const pendingApprovals = vehicles.filter(v => v.validationStatus === 'pending').length;

    res.json({
      totalIncome,
      totalBookings:    bookings.length,
      canceledBookings: cancelledCount,
      totalVehicles:    vehicles.length,
      pendingApprovals,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching analytics.', error: err.message });
  }
});

module.exports = router;
