const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const { authMiddleware, adminOrStaffMiddleware } = require('../middleware/authMiddleware');
const { uploadVehicleFiles, buildDocuments } = require('../middleware/uploadMiddleware');

// ═══════════════════════════════════════════════════════════════════
//  VEHICLE ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/vehicles  — list all (filter by ?status=pending supported)
router.get('/api/vehicles', async (req, res) => {
  try {
    const filter = req.query.status ? { validationStatus: req.query.status } : {};
    const vehicles = await Vehicle.find(filter).lean();
    
    // Check if vehicles are currently physically booked or soon to be booked
    const now = new Date();
    const soon = new Date(Date.now() + 65 * 60 * 1000); // 65 minute threshold
    
    const activeBookings = await Booking.find({
      status: { $in: ['confirmed', 'active', 'returning'] },
      startDate: { $lte: soon },
      endDate: { $gt: now }
    });
    
    const activeVehicleIds = activeBookings.map(b => b.vehicle.toString());

    // Aggregate feedback ratings per vehicle
    const allFeedbacks = await Feedback.find({ vehicle: { $in: vehicles.map(v => v._id) } }).select('vehicle rating');
    const ratingMap = {};
    allFeedbacks.forEach(f => {
      const vid = f.vehicle.toString();
      if (!ratingMap[vid]) ratingMap[vid] = { total: 0, count: 0 };
      ratingMap[vid].total += f.rating;
      ratingMap[vid].count += 1;
    });
    
    const augmentedVehicles = vehicles.map(v => {
      const r = ratingMap[v._id.toString()];
      return {
        ...v,
        isCurrentlyBooked: activeVehicleIds.includes(v._id.toString()),
        avgRating: r ? parseFloat((r.total / r.count).toFixed(1)) : null,
        reviewCount: r ? r.count : 0,
      };
    });
    
    res.json(augmentedVehicles);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicles.', error: err.message });
  }
});

// POST /api/vehicles  — add a vehicle (Car Owner, requires auth) — multipart/form-data
router.post('/api/vehicles', authMiddleware, uploadVehicleFiles, async (req, res) => {
  try {
    const { makeAndModel, licensePlate, pricePerDay, type, transmission, fuelType, seats, year, features } = req.body;
    if (!makeAndModel || !licensePlate || !pricePerDay)
      return res.status(400).json({ message: 'makeAndModel, licensePlate and pricePerDay are required.' });

    const files = req.files || {};
    console.log('Received files for vehicle:', Object.keys(files).map(k => `${k}: ${files[k].length}`));
    if (!files.image || files.image.length === 0)
      return res.status(400).json({ message: 'At least one vehicle photo is required.' });
    if (files.image.length > 5)
      return res.status(400).json({ message: 'Maximum 5 vehicle photos allowed.' });

    // Validate required documents
    const REQUIRED_DOCS = ['revenueLicense', 'insurance', 'registration'];
    const missing = REQUIRED_DOCS.filter(d => !files[d] || !files[d][0]);
    if (missing.length > 0)
      return res.status(400).json({ message: `Missing required documents: ${missing.join(', ')}` });

    const images = files.image.map(f => `/uploads/${f.filename}`);
    const imageUrl = images[0]; // primary image for backward compat
    const documents = buildDocuments(files);

    const vehicle = await Vehicle.create({
      makeAndModel,
      licensePlate: licensePlate.toUpperCase(),
      pricePerDay: Number(pricePerDay),
      type, transmission, fuelType,
      seats: seats ? Number(seats) : undefined,
      year: year ? Number(year) : undefined,
      features,
      imageUrl,
      images,
      documents,
      isAvailable:      true,
      validationStatus: 'pending',
      owner:            req.user.id,
    });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error adding vehicle.', error: err.message });
  }
});

// PATCH /api/vehicles/:id/status  — Admin accept/reject (with tracking)
router.patch('/api/vehicles/:id/status', authMiddleware, adminOrStaffMiddleware(['validation']), async (req, res) => {
  try {
    const { validationStatus, rejectionReason, validationNote } = req.body;
    if (!['accepted', 'rejected'].includes(validationStatus))
      return res.status(400).json({ message: 'Status must be accepted or rejected.' });

    const update = {
      validationStatus,
      isAvailable: validationStatus === 'accepted',
      validatedAt: new Date(),
      validatedBy: req.user.id,
    };
    if (validationStatus === 'rejected' && rejectionReason) update.rejectionReason = rejectionReason;
    if (validationStatus === 'accepted') update.rejectionReason = '';
    if (validationNote) update.validationNote = validationNote;

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('owner', 'name email').populate('validatedBy', 'name');
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error updating vehicle status.', error: err.message });
  }
});

module.exports = router;
