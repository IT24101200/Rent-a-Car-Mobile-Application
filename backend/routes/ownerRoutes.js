const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { authMiddleware, ownerMiddleware } = require('../middleware/authMiddleware');
const { uploadVehicleFiles, buildDocuments } = require('../middleware/uploadMiddleware');

// ═══════════════════════════════════════════════════════════════════
//  CAR OWNER ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/owner/vehicles — list only the owner's vehicles
router.get('/api/owner/vehicles', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching owner vehicles.', error: err.message });
  }
});

// PATCH /api/owner/vehicles/:id/availability — toggle vehicle availability
router.patch('/api/owner/vehicles/:id/availability', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') return res.status(400).json({ message: 'isAvailable must be a boolean.' });
    
    // Ensure the vehicle actually belongs to this owner
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { isAvailable },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found or unauthorized.' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error updating availability.', error: err.message });
  }
});

// PUT /api/owner/vehicles/:id — edit a vehicle (only if not accepted) — multipart/form-data
router.put('/api/owner/vehicles/:id', authMiddleware, ownerMiddleware, uploadVehicleFiles, async (req, res) => {
  try {
    const { makeAndModel, licensePlate, pricePerDay, type, transmission, fuelType, seats, year, features } = req.body;
    if (!makeAndModel || !licensePlate || !pricePerDay)
      return res.status(400).json({ message: 'Missing required fields.' });

    const existingVehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user.id });
    if (!existingVehicle) return res.status(404).json({ message: 'Vehicle not found or unauthorized.' });

    const files = req.files || {};

    const isPriceIncrease = Number(pricePerDay) > existingVehicle.pricePerDay;
    if (isPriceIncrease && !(files.priceJustification && files.priceJustification[0])) {
      return res.status(400).json({ message: 'A price justification document is required for price increases.' });
    }

    // ── Two-tier edit logic ──
    const criticalChanged =
      makeAndModel !== existingVehicle.makeAndModel ||
      licensePlate.toUpperCase() !== existingVehicle.licensePlate ||
      isPriceIncrease ||
      (files.image && files.image.length > 0) ||
      Object.keys(files).some(k => ['revenueLicense', 'insurance', 'registration', 'fitness', 'priceJustification'].includes(k));

    // ── Handle multi-image updates ──
    // Parse removedImages from body (JSON array of URLs to remove)
    let removedImages = [];
    try { removedImages = JSON.parse(req.body.removedImages || '[]'); } catch (e) { /* ignore */ }

    // Start with existing images (backward compat: fallback to [imageUrl])
    let currentImages = existingVehicle.images && existingVehicle.images.length > 0
      ? [...existingVehicle.images]
      : (existingVehicle.imageUrl ? [existingVehicle.imageUrl] : []);

    // Remove images marked for deletion
    if (removedImages.length > 0) {
      removedImages.forEach(imgUrl => {
        const oldPath = path.join(__dirname, '..', imgUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      });
      currentImages = currentImages.filter(url => !removedImages.includes(url));
    }

    // Add newly uploaded images
    if (files.image && files.image.length > 0) {
      const newUrls = files.image.map(f => `/uploads/${f.filename}`);
      currentImages = [...currentImages, ...newUrls];
    }

    // Enforce max 5
    if (currentImages.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 vehicle photos allowed.' });
    }

    existingVehicle.images = currentImages;
    existingVehicle.imageUrl = currentImages[0] || null;

    // Merge any newly uploaded documents (keep existing ones for untouched types)
    existingVehicle.documents = buildDocuments(files, existingVehicle.documents || []);

    existingVehicle.makeAndModel = makeAndModel;
    existingVehicle.licensePlate = licensePlate.toUpperCase();
    
    // Handle Price Proposal
    if (isPriceIncrease) {
      existingVehicle.priceProposal = {
        proposedPrice: Number(pricePerDay),
        proposedBy: 'owner',
        justificationDoc: `/uploads/${files.priceJustification[0].filename}`,
        status: 'pending',
        createdAt: Date.now()
      };
    } else if (Number(pricePerDay) !== existingVehicle.pricePerDay) {
      existingVehicle.priceUpdatedAt = Date.now();
      existingVehicle.pricePerDay = Number(pricePerDay);
    }
    if (type !== undefined) existingVehicle.type = type;
    if (transmission !== undefined) existingVehicle.transmission = transmission;
    if (fuelType !== undefined) existingVehicle.fuelType = fuelType;
    if (seats !== undefined) existingVehicle.seats = Number(seats);
    if (year !== undefined) existingVehicle.year = Number(year);
    if (features !== undefined) existingVehicle.features = features;

    // Only reset status if critical fields changed
    if (criticalChanged && !isPriceIncrease) {
      existingVehicle.validationStatus = 'pending';
      existingVehicle.isAvailable = false;
    }

    await existingVehicle.save();
    res.json(existingVehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error editing vehicle.', error: err.message });
  }
});

// PATCH /api/owner/vehicles/:id/price-proposal — Owner resolves Admin's price drop
router.patch('/api/owner/vehicles/:id/price-proposal', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    if (!vehicle.priceProposal || vehicle.priceProposal.status !== 'pending' || vehicle.priceProposal.proposedBy !== 'admin') {
      return res.status(400).json({ message: 'No pending price proposal from admin found.' });
    }

    if (action === 'approve') {
      vehicle.pricePerDay = vehicle.priceProposal.proposedPrice;
      vehicle.priceUpdatedAt = Date.now();
      vehicle.priceProposal.status = 'approved';
    } else {
      vehicle.priceProposal.status = 'rejected';
    }
    await vehicle.save();
    
    // Clear it
    vehicle.priceProposal = undefined;
    await vehicle.save();

    res.json({ message: `Price proposal ${action}d.`, vehicle });
  } catch (err) {
    res.status(500).json({ message: 'Error resolving proposal.', error: err.message });
  }
});

// DELETE /api/owner/vehicles/:id — delete a vehicle
router.delete('/api/owner/vehicles/:id', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found or unauthorized.' });
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting vehicle.', error: err.message });
  }
});

// GET /api/owner/bookings — get bookings for owner's vehicles
router.get('/api/owner/bookings', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const myVehicles = await Vehicle.find({ owner: req.user.id }).select('_id');
    const vehicleIds = myVehicles.map(v => v._id);
    
    const bookings = await Booking.find({ vehicle: { $in: vehicleIds } })
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching owner bookings.', error: err.message });
  }
});

// PATCH /api/owner/bookings/:id/complete — owner marks a booking as completed
router.patch('/api/owner/bookings/:id/complete', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    // We must ensure the booking belongs to a vehicle this owner owns
    const booking = await Booking.findById(req.params.id).populate('vehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    
    if (booking.vehicle.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized. You do not own this vehicle.' });
    }
    
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: `Cannot complete a booking that is currently ${booking.status}.` });
    }
    
    booking.status = 'completed';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error marking booking complete.', error: err.message });
  }
});

module.exports = router;
