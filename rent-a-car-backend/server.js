const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

// ── Models ──────────────────────────────────────────────────────────
const Vehicle  = require('./models/Vehicle');
const User     = require('./models/User');
const Booking  = require('./models/Booking');
const Feedback = require('./models/Feedback');

const app = express();
app.use(cors());
app.use(express.json());

// ── Image Upload Setup (Multer) ──────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const unique = `vehicle_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed.'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // max 5MB

// Multi-field upload handler: vehicle image + 4 document types
const uploadVehicleFiles = upload.fields([
  { name: 'image',          maxCount: 1 },
  { name: 'revenueLicense', maxCount: 1 },
  { name: 'insurance',      maxCount: 1 },
  { name: 'registration',   maxCount: 1 },
  { name: 'fitness',        maxCount: 1 },
]);

// Multi-field upload handler for KYC Verification
const uploadKycFiles = upload.fields([
  { name: 'dlFront', maxCount: 1 },
  { name: 'dlBack',  maxCount: 1 },
  { name: 'nic',     maxCount: 1 },
  { name: 'selfie',  maxCount: 1 },
]);

// Helper to build documents array from req.files
const buildDocuments = (files, existing = []) => {
  const DOC_TYPES = ['revenueLicense', 'insurance', 'registration', 'fitness'];
  const docs = [...existing];
  DOC_TYPES.forEach(type => {
    if (files[type] && files[type][0]) {
      const idx = docs.findIndex(d => d.docType === type);
      const entry = { docType: type, fileUrl: `/uploads/${files[type][0].filename}`, uploadedAt: new Date() };
      if (idx >= 0) docs[idx] = entry; else docs.push(entry);
    }
  });
  return docs;
};

// ── Serve Uploaded Images Statically (with CORS headers for Cloudflare tunnel) ──
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir, { maxAge: '1d' }));

// Simple request logger to debug connectivity
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ── MongoDB ─────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB!'))
  .catch((err) => console.log('❌ MongoDB Error:', err.message));

// ── Auth Middleware ─────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

const ownerMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'Car Owner' || req.user.role === 'Admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Car Owner only.' });
  }
};

// ═══════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/auth/me — returns full, real-time user object including identity
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user state.', error: err.message });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email, and password are required.' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(409).json({ message: 'An account with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashedPassword, role: role || 'Customer' });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password.' });

    if (user.status === 'suspended')
      return res.status(403).json({ message: 'Your account has been suspended by an Administrator.' });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// PUT /api/auth/profile — update name & email
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email)
      return res.status(400).json({ message: 'Name and email are required.' });

    // Check email not already used by someone else
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
    if (existing)
      return res.status(409).json({ message: 'That email is already in use by another account.' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim(), email: email.toLowerCase() },
      { new: true }
    );

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile.', error: err.message });
  }
});

// PUT /api/auth/password — change password
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new passwords are required.' });

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(401).json({ message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.id, { password: hashed });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to change password.', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  IDENTITY (KYC) ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/users/kyc — upload Identity documents for verification
app.post('/api/users/kyc', authMiddleware, uploadKycFiles, async (req, res) => {
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
    
    res.json({ message: 'KYC documents submitted.', identity: user.identity });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading KYC documents.', error: err.message });
  }
});

// PATCH /api/admin/users/:id/kyc — manually toggle user KYC status from Admin dashboard
app.patch('/api/admin/users/:id/kyc', authMiddleware, adminMiddleware, async (req, res) => {
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

// ═══════════════════════════════════════════════════════════════════
//  VEHICLE ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/vehicles  — list all (filter by ?status=pending supported)
app.get('/api/vehicles', async (req, res) => {
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
    
    const augmentedVehicles = vehicles.map(v => ({
      ...v,
      isCurrentlyBooked: activeVehicleIds.includes(v._id.toString())
    }));
    
    res.json(augmentedVehicles);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicles.', error: err.message });
  }
});

// POST /api/vehicles  — add a vehicle (Car Owner, requires auth) — multipart/form-data
app.post('/api/vehicles', authMiddleware, uploadVehicleFiles, async (req, res) => {
  try {
    const { makeAndModel, licensePlate, pricePerDay, type, transmission, fuelType, seats, year, features } = req.body;
    if (!makeAndModel || !licensePlate || !pricePerDay)
      return res.status(400).json({ message: 'makeAndModel, licensePlate and pricePerDay are required.' });

    const files = req.files || {};
    if (!files.image || !files.image[0])
      return res.status(400).json({ message: 'A vehicle photo is required.' });

    // Validate required documents
    const REQUIRED_DOCS = ['revenueLicense', 'insurance', 'registration'];
    const missing = REQUIRED_DOCS.filter(d => !files[d] || !files[d][0]);
    if (missing.length > 0)
      return res.status(400).json({ message: `Missing required documents: ${missing.join(', ')}` });

    const imageUrl = `/uploads/${files.image[0].filename}`;
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

// PATCH /api/vehicles/:id/status  — Admin accept/reject
app.patch('/api/vehicles/:id/status', authMiddleware, async (req, res) => {
  try {
    const { validationStatus } = req.body;
    if (!['accepted', 'rejected'].includes(validationStatus))
      return res.status(400).json({ message: 'Status must be accepted or rejected.' });

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { validationStatus, isAvailable: validationStatus === 'accepted' },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error updating vehicle status.', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  CAR OWNER ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/owner/vehicles — list only the owner's vehicles
app.get('/api/owner/vehicles', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching owner vehicles.', error: err.message });
  }
});

// PATCH /api/owner/vehicles/:id/availability — toggle vehicle availability
app.patch('/api/owner/vehicles/:id/availability', authMiddleware, ownerMiddleware, async (req, res) => {
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
app.put('/api/owner/vehicles/:id', authMiddleware, ownerMiddleware, uploadVehicleFiles, async (req, res) => {
  try {
    const { makeAndModel, licensePlate, pricePerDay, type, transmission, fuelType, seats, year, features } = req.body;
    if (!makeAndModel || !licensePlate || !pricePerDay)
      return res.status(400).json({ message: 'Missing required fields.' });

    const existingVehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user.id });
    if (!existingVehicle) return res.status(404).json({ message: 'Vehicle not found or unauthorized.' });
    if (existingVehicle.validationStatus === 'accepted') {
      return res.status(403).json({ message: 'Cannot edit an already accepted vehicle.' });
    }

    const files = req.files || {};

    // Replace vehicle photo if new one uploaded
    if (files.image && files.image[0]) {
      if (existingVehicle.imageUrl) {
        const oldPath = path.join(__dirname, existingVehicle.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      existingVehicle.imageUrl = `/uploads/${files.image[0].filename}`;
    }

    // Merge any newly uploaded documents (keep existing ones for untouched types)
    existingVehicle.documents = buildDocuments(files, existingVehicle.documents || []);

    existingVehicle.makeAndModel = makeAndModel;
    existingVehicle.licensePlate = licensePlate.toUpperCase();
    existingVehicle.pricePerDay = Number(pricePerDay);
    if (type !== undefined) existingVehicle.type = type;
    if (transmission !== undefined) existingVehicle.transmission = transmission;
    if (fuelType !== undefined) existingVehicle.fuelType = fuelType;
    if (seats !== undefined) existingVehicle.seats = Number(seats);
    if (year !== undefined) existingVehicle.year = Number(year);
    if (features !== undefined) existingVehicle.features = features;

    existingVehicle.validationStatus = 'pending';
    existingVehicle.isAvailable = false;

    await existingVehicle.save();
    res.json(existingVehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error editing vehicle.', error: err.message });
  }
});

// DELETE /api/owner/vehicles/:id — delete a vehicle
app.delete('/api/owner/vehicles/:id', authMiddleware, ownerMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found or unauthorized.' });
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting vehicle.', error: err.message });
  }
});

// GET /api/owner/bookings — get bookings for owner's vehicles
app.get('/api/owner/bookings', authMiddleware, ownerMiddleware, async (req, res) => {
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
app.patch('/api/owner/bookings/:id/complete', authMiddleware, ownerMiddleware, async (req, res) => {
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

// ═══════════════════════════════════════════════════════════════════
//  BOOKING ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/bookings  — create a booking (requires auth)
app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { vehicleId, startDate, endDate, totalPrice } = req.body;
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
    // Reject if any confirmed booking overlaps the exact requested time window
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
      status:    'confirmed',
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error creating booking.', error: err.message });
  }
});

// GET /api/bookings/my  — get current user's bookings
app.get('/api/bookings/my', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay imageUrl')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings.', error: err.message });
  }
});

// PATCH /api/bookings/:id/cancel — cancel an upcoming trip (Customer)
app.patch('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
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
app.patch('/api/bookings/:id/reschedule', authMiddleware, async (req, res) => {
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
app.patch('/api/bookings/:id/checkin', authMiddleware, upload.single('conditionPhoto'), async (req, res) => {
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
app.patch('/api/bookings/:id/checkout', authMiddleware, upload.single('conditionPhoto'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'active') return res.status(400).json({ message: 'Trip is not active.' });

    booking.status = 'returning';
    booking.checkOutDetails = {
      odometer: req.body.odometer || 0,
      conditionPhoto: req.file ? `/uploads/${req.file.filename}` : null,
      time: new Date()
    };

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Check-out failed.', error: err.message });
  }
});

// PATCH /api/owner/bookings/:id/verify — Owner completes trip
app.patch('/api/owner/bookings/:id/verify', authMiddleware, async (req, res) => {
  try {
    // Note: We should ideally verify the user is the owner of the vehicle, but this will do with existing logic limits
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

// ═══════════════════════════════════════════════════════════════════
//  FEEDBACK ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/feedback
app.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating)
      return res.status(400).json({ message: 'bookingId and rating are required.' });

    const feedback = await Feedback.create({
      booking: bookingId,
      user:    req.user.id,
      rating,
      comment,
    });
    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ message: 'Error submitting feedback.', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  ANALYTICS & ADVANCED ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/analytics
app.get('/api/analytics', authMiddleware, adminMiddleware, async (req, res) => {
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

// GET /api/admin/users — List all users (except admins)
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'Admin' } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users.', error: err.message });
  }
});

// PATCH /api/admin/users/:id/status — Suspend/Activate user
app.patch('/api/admin/users/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status))
      return res.status(400).json({ message: 'Invalid status.' });
    
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error updating user status.', error: err.message });
  }
});

// GET /api/admin/bookings — List all platform bookings
app.get('/api/admin/bookings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay owner')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings.', error: err.message });
  }
});

// PATCH /api/admin/bookings/:id/force-cancel
app.patch('/api/admin/bookings/:id/force-cancel', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error cancelling booking.', error: err.message });
  }
});

// GET /api/admin/feedback — List all feedbacks
app.get('/api/admin/feedback', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('user', 'name email')
      .populate({
        path: 'booking',
        populate: { path: 'vehicle', select: 'makeAndModel' }
      })
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching feedback.', error: err.message });
  }
});

// DELETE /api/admin/feedback/:id — Delete review
app.delete('/api/admin/feedback/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing feedback.', error: err.message });
  }
});

// ── Start Server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));