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
const Report   = require('./models/Report');

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

// ── Staff Role Permission Map ──────────────────────────────────
const STAFF_PERMISSIONS = {
  'Booking Manager':            ['bookings'],
  'Feedback Manager':           ['feedback'],
  'Vehicle Manager':            ['fleet'],
  'Vehicle Validation Manager': ['validation'],
  'Payment Manager':            ['payments'],
  'Report Handling Manager':    ['analytics', 'report'],
};

// Admin = full access, Staff = scoped access by staffRole
const adminOrStaffMiddleware = (allowedScopes) => (req, res, next) => {
  if (req.user?.role === 'Admin') return next();
  
  if (req.user?.role === 'Staff') {
    const staffPerms = STAFF_PERMISSIONS[req.user.staffRole] || [];
    const hasAccess = allowedScopes.some(s => staffPerms.includes(s));
    if (hasAccess) return next();
  }
  
  res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
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
      { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole || null },
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
      { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole || null },
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
      { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole || null },
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

// PATCH /api/vehicles/:id/status  — Admin accept/reject (with tracking)
app.patch('/api/vehicles/:id/status', authMiddleware, adminOrStaffMiddleware(['validation']), async (req, res) => {
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

    const files = req.files || {};

    // ── Two-tier edit logic ──
    // Critical changes (name, plate, photo, documents) reset status to pending
    // Safe changes (price, features, seats, etc.) keep current status
    const criticalChanged =
      makeAndModel !== existingVehicle.makeAndModel ||
      licensePlate.toUpperCase() !== existingVehicle.licensePlate ||
      (files.image && files.image[0]) ||
      Object.keys(files).some(k => ['revenueLicense', 'insurance', 'registration', 'fitness'].includes(k));

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

    // Only reset status if critical fields changed
    if (criticalChanged) {
      existingVehicle.validationStatus = 'pending';
      existingVehicle.isAvailable = false;
    }

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

// POST /api/feedback — submit feedback (with duplicate check + vehicle auto-populate)
app.post('/api/feedback', authMiddleware, async (req, res) => {
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

// GET /api/vehicles/:id/feedback — public reviews for a vehicle
app.get('/api/vehicles/:id/feedback', async (req, res) => {
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
app.get('/api/owner/feedback', authMiddleware, ownerMiddleware, async (req, res) => {
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
app.patch('/api/owner/feedback/:id/reply', authMiddleware, ownerMiddleware, async (req, res) => {
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

// GET /api/owner/analytics — owner-level analytics
app.get('/api/owner/analytics', authMiddleware, ownerMiddleware, async (req, res) => {
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
app.get('/api/admin/analytics/report', authMiddleware, adminOrStaffMiddleware(['analytics', 'report']), async (req, res) => {
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

// ═══════════════════════════════════════════════════════════════════
//  ANALYTICS & ADVANCED ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/analytics
app.get('/api/analytics', authMiddleware, adminOrStaffMiddleware(['analytics', 'report']), async (req, res) => {
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

// PATCH /api/admin/users/:id/role — Promote user to Admin
app.patch('/api/admin/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'Admin') return res.status(400).json({ message: 'Invalid role assignment.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error updating user role.', error: err.message });
  }
});

// DELETE /api/admin/users/:id — Permanently delete user
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user.', error: err.message });
  }
});

// GET /api/admin/bookings — List all platform bookings
app.get('/api/admin/bookings', authMiddleware, adminOrStaffMiddleware(['bookings', 'bookings-readonly']), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings.', error: err.message });
  }
});

// PATCH /api/admin/bookings/:id/force-cancel
app.patch('/api/admin/bookings/:id/force-cancel', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
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

// PATCH /api/admin/bookings/:id/status — Booking Manager manually changes status
app.patch('/api/admin/bookings/:id/status', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'active', 'returning', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Valid: ' + validStatuses.join(', ') });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const oldStatus = booking.status;
    booking.status = status;
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      booking.refundStatus = 'pending';
      booking.cancellationReason = booking.cancellationReason || 'Cancelled by Booking Manager';
    }
    await booking.save();
    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner');
    res.json({ message: `Status changed: ${oldStatus} → ${status}`, booking: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating booking status.', error: err.message });
  }
});

// PATCH /api/admin/bookings/:id/reschedule — Booking Manager reschedules dates
app.patch('/api/admin/bookings/:id/reschedule', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate required.' });
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return res.status(400).json({ message: 'End date must be after start date.' });
    const booking = await Booking.findById(req.params.id).populate('vehicle', 'pricePerDay');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot reschedule a ' + booking.status + ' booking.' });
    }
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id }, vehicle: booking.vehicle._id,
      status: { $nin: ['cancelled'] },
      startDate: { $lt: end }, endDate: { $gt: start }
    });
    if (conflict) return res.status(409).json({ message: 'Date conflict with another booking.' });
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    booking.startDate = start;
    booking.endDate = end;
    booking.totalPrice = days * (booking.vehicle.pricePerDay || 0);
    await booking.save();
    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner');
    res.json({ message: `Rescheduled. New total: Rs.${booking.totalPrice}`, booking: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error rescheduling.', error: err.message });
  }
});

// PATCH /api/admin/bookings/:id/refund — Update refund status
app.patch('/api/admin/bookings/:id/refund', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const { refundStatus } = req.body;
    if (!['none', 'pending', 'issued'].includes(refundStatus)) {
      return res.status(400).json({ message: 'Invalid refundStatus.' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    booking.refundStatus = refundStatus;
    await booking.save();
    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate pricePerDay type owner');
    res.json({ message: 'Refund status: ' + refundStatus, booking: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating refund.', error: err.message });
  }
});

// DELETE /api/admin/bookings/:id — Delete old booking record
app.delete('/api/admin/bookings/:id', authMiddleware, adminOrStaffMiddleware(['bookings']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (!['cancelled', 'completed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only cancelled/completed bookings can be deleted.' });
    }
    await Booking.findByIdAndDelete(req.params.id);
    await Feedback.deleteMany({ booking: req.params.id });
    res.json({ message: 'Booking record deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting booking.', error: err.message });
  }
});
// GET /api/admin/vehicles — Full fleet list with owner info (all statuses)
app.get('/api/admin/vehicles', authMiddleware, adminOrStaffMiddleware(['fleet', 'validation']), async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('owner', 'name email')
      .populate('validatedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching fleet.', error: err.message });
  }
});

// PATCH /api/admin/vehicles/:id — Edit vehicle details
app.patch('/api/admin/vehicles/:id', authMiddleware, adminOrStaffMiddleware(['fleet']), async (req, res) => {
  try {
    const { pricePerDay, features, isAvailable } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    if (pricePerDay !== undefined) vehicle.pricePerDay = pricePerDay;
    if (features !== undefined) vehicle.features = features;
    if (isAvailable !== undefined) vehicle.isAvailable = isAvailable;
    await vehicle.save();

    const populated = await Vehicle.findById(vehicle._id).populate('owner', 'name email');
    res.json({ message: 'Vehicle updated.', vehicle: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating vehicle.', error: err.message });
  }
});

// DELETE /api/admin/vehicles/:id — Delete vehicle (only if no active bookings)
app.delete('/api/admin/vehicles/:id', authMiddleware, adminOrStaffMiddleware(['fleet']), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    const activeBookings = await Booking.countDocuments({
      vehicle: req.params.id,
      status: { $in: ['confirmed', 'active', 'returning'] }
    });
    if (activeBookings > 0) {
      return res.status(400).json({ message: `Cannot delete — ${activeBookings} active booking(s) exist.` });
    }

    await Feedback.deleteMany({ vehicle: req.params.id });
    await Booking.deleteMany({ vehicle: req.params.id, status: { $in: ['cancelled', 'completed'] } });
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle and related records deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting vehicle.', error: err.message });
  }
});

// PATCH /api/admin/vehicles/:id/validation-note — Add/update validation note
app.patch('/api/admin/vehicles/:id/validation-note', authMiddleware, adminOrStaffMiddleware(['validation']), async (req, res) => {
  try {
    const { validationNote } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    vehicle.validationNote = validationNote || '';
    await vehicle.save();
    const populated = await Vehicle.findById(vehicle._id).populate('owner', 'name email').populate('validatedBy', 'name');
    res.json({ message: 'Validation note updated.', vehicle: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating note.', error: err.message });
  }
});

// GET /api/admin/payments — Payment-focused booking list
app.get('/api/admin/payments', authMiddleware, adminOrStaffMiddleware(['payments']), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate type')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching payments.', error: err.message });
  }
});

// PATCH /api/admin/payments/:id/refund — Issue or revoke refund
app.patch('/api/admin/payments/:id/refund', authMiddleware, adminOrStaffMiddleware(['payments']), async (req, res) => {
  try {
    const { refundStatus } = req.body;
    if (!['none', 'pending', 'issued'].includes(refundStatus))
      return res.status(400).json({ message: 'Invalid refund status.' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    booking.refundStatus = refundStatus;
    if (refundStatus === 'issued') booking.paymentStatus = 'refunded';
    else if (refundStatus === 'none') booking.paymentStatus = 'paid';
    await booking.save();
    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email').populate('vehicle', 'makeAndModel licensePlate type');
    res.json({ message: `Refund ${refundStatus}.`, booking: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating refund.', error: err.message });
  }
});

// GET /api/admin/feedback — List all feedbacks
app.get('/api/admin/feedback', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate')
      .populate({
        path: 'booking',
        populate: { path: 'vehicle', select: 'makeAndModel licensePlate' }
      })
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching feedback.', error: err.message });
  }
});

// DELETE /api/admin/feedback/:id — Delete review
app.delete('/api/admin/feedback/:id', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing feedback.', error: err.message });
  }
});

// PATCH /api/admin/feedback/:id/flag — Toggle flag on feedback
app.patch('/api/admin/feedback/:id/flag', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: 'Feedback not found.' });
    fb.flagged = !fb.flagged;
    await fb.save();
    const populated = await Feedback.findById(fb._id)
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate')
      .populate({ path: 'booking', populate: { path: 'vehicle', select: 'makeAndModel licensePlate' } });
    res.json({ message: `Feedback ${fb.flagged ? 'flagged' : 'unflagged'}.`, feedback: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error toggling flag.', error: err.message });
  }
});

// PATCH /api/admin/feedback/:id/note — Add/update admin note
app.patch('/api/admin/feedback/:id/note', authMiddleware, adminOrStaffMiddleware(['feedback']), async (req, res) => {
  try {
    const { adminNote } = req.body;
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: 'Feedback not found.' });
    fb.adminNote = adminNote || '';
    await fb.save();
    const populated = await Feedback.findById(fb._id)
      .populate('user', 'name email')
      .populate('vehicle', 'makeAndModel licensePlate')
      .populate({ path: 'booking', populate: { path: 'vehicle', select: 'makeAndModel licensePlate' } });
    res.json({ message: 'Admin note updated.', feedback: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating note.', error: err.message });
  }
});

// ── Report CRUD (Saved Reports) ───────────────────────────────────────

// POST /api/admin/reports — Create report with live data snapshot
app.post('/api/admin/reports', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    const { title, type, notes } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });

    // Capture live snapshot
    const [allBookings, allVehicles, allFeedbacks, allUsers] = await Promise.all([
      Booking.find().populate('vehicle', 'makeAndModel owner'),
      Vehicle.find(),
      Feedback.find().populate('vehicle', 'makeAndModel'),
      User.find(),
    ]);

    const totalRevenue = allBookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalPrice || 0), 0);
    const statusBreakdown = {};
    allBookings.forEach(b => { statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1; });

    const monthlyRevenue = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en', { month: 'short' });
      const amount = allBookings.filter(b => {
        const bd = new Date(b.createdAt);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear() && b.status !== 'cancelled';
      }).reduce((s, b) => s + (b.totalPrice || 0), 0);
      monthlyRevenue.push({ label, amount });
    }

    const vehIncome = {};
    allBookings.filter(b => b.status !== 'cancelled').forEach(b => {
      if (b.vehicle) { const n = b.vehicle.makeAndModel || 'Unknown'; vehIncome[n] = (vehIncome[n] || 0) + (b.totalPrice || 0); }
    });
    const topEarners = Object.entries(vehIncome).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, income]) => ({ name, income }));

    const vehRatings = {};
    allFeedbacks.forEach(f => {
      if (f.vehicle) {
        const n = f.vehicle.makeAndModel || 'Unknown';
        if (!vehRatings[n]) vehRatings[n] = [];
        vehRatings[n].push(f.rating);
      }
    });
    const topRated = Object.entries(vehRatings).map(([name, rs]) => ({
      name, avg: parseFloat((rs.reduce((s, r) => s + r, 0) / rs.length).toFixed(1)), count: rs.length
    })).sort((a, b) => b.avg - a.avg).slice(0, 5);

    const ratingDist = [0, 0, 0, 0, 0];
    allFeedbacks.forEach(f => { if (f.rating >= 1 && f.rating <= 5) ratingDist[f.rating - 1]++; });

    const owners = allUsers.filter(u => u.role === 'Car Owner');
    const ownerPerformance = owners.map(o => {
      const oVehicles = allVehicles.filter(v => v.owner && v.owner.toString() === o._id.toString());
      const oVehicleIds = oVehicles.map(v => v._id.toString());
      const oBookings = allBookings.filter(b => b.vehicle && oVehicleIds.includes(b.vehicle._id ? b.vehicle._id.toString() : b.vehicle.toString()));
      const oFeedbacks = allFeedbacks.filter(f => f.vehicle && oVehicleIds.includes(f.vehicle._id ? f.vehicle._id.toString() : f.vehicle.toString()));
      return {
        name: o.name, email: o.email, vehicleCount: oVehicles.length,
        totalIncome: oBookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalPrice || 0), 0),
        avgRating: oFeedbacks.length > 0 ? parseFloat((oFeedbacks.reduce((s, f) => s + f.rating, 0) / oFeedbacks.length).toFixed(1)) : null
      };
    }).filter(o => o.vehicleCount > 0);

    const platformAvgRating = allFeedbacks.length > 0
      ? parseFloat((allFeedbacks.reduce((s, f) => s + f.rating, 0) / allFeedbacks.length).toFixed(1)) : null;

    const report = await Report.create({
      title, type: type || 'full', notes: notes || '',
      createdBy: req.user.id,
      snapshot: {
        totalRevenue, totalBookings: allBookings.length, totalVehicles: allVehicles.length,
        totalUsers: allUsers.length, platformAvgRating, totalReviews: allFeedbacks.length,
        statusBreakdown, topEarners, topRated, monthlyRevenue, ratingDist, ownerPerformance
      }
    });
    const populated = await Report.findById(report._id).populate('createdBy', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Error creating report.', error: err.message });
  }
});

// GET /api/admin/reports — List all saved reports
app.get('/api/admin/reports', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reports.', error: err.message });
  }
});

// GET /api/admin/reports/:id — Get single report
app.get('/api/admin/reports/:id', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('createdBy', 'name');
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching report.', error: err.message });
  }
});

// PATCH /api/admin/reports/:id — Update title/notes
app.patch('/api/admin/reports/:id', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    const { title, notes } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (title) report.title = title;
    if (notes !== undefined) report.notes = notes;
    await report.save();
    const populated = await Report.findById(report._id).populate('createdBy', 'name');
    res.json({ message: 'Report updated.', report: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating report.', error: err.message });
  }
});

// DELETE /api/admin/reports/:id — Delete report
app.delete('/api/admin/reports/:id', authMiddleware, adminOrStaffMiddleware(['report']), async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting report.', error: err.message });
  }
});

// ── Automated Booking Cancellations (Cron Job) ────────────────────────
const cron = require('node-cron');

// Runs every 15 minutes to check for no-shows (bookings that started > 60 mins ago but are still 'confirmed')
cron.schedule('*/15 * * * *', async () => {
  try {
    const gracePeriodThreshold = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago
    
    // Find missing bookings
    const expiredBookings = await Booking.find({
      status: 'confirmed',
      startDate: { $lt: gracePeriodThreshold }
    });

    if (expiredBookings.length > 0) {
      console.log(`[CRON] Found ${expiredBookings.length} expired bookings. Triggering automated cancellations...`);
      
      for (const booking of expiredBookings) {
        // Issue an 80% theoretical refund, keeping 20% penalty
        booking.status = 'cancelled';
        booking.refundStatus = 'issued';
        booking.cancellationReason = 'System Automatic: No-show for pickup (80% Refund Issued)';
        await booking.save();
      }
      console.log('[CRON] Automated no-show cancellations complete.');
    }
  } catch (err) {
    console.error('[CRON Error] Failed to process automated cancellations:', err.message);
  }
});

// ── Start Server ────────────────────────────────────────────────────
// POST /api/admin/staff — Admin creates a new staff account
app.post('/api/admin/staff', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, password, staffRole } = req.body;
    const validRoles = ['Booking Manager', 'Feedback Manager', 'Vehicle Manager', 'Vehicle Validation Manager', 'Payment Manager', 'Report Handling Manager'];

    if (!name || !email || !password || !staffRole) {
      return res.status(400).json({ message: 'Name, email, password, and staff role are required.' });
    }
    if (!validRoles.includes(staffRole)) {
      return res.status(400).json({ message: 'Invalid staff role.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email: email.toLowerCase(), password: hashedPassword, role: 'Staff', staffRole, status: 'active' });
    await user.save();

    res.status(201).json({ message: `Staff member "${name}" created as ${staffRole}.`, user: { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create staff member.', error: err.message });
  }
});

// PATCH /api/admin/users/:id/staff-role — Admin assigns/revokes staff role
app.patch('/api/admin/users/:id/staff-role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { staffRole } = req.body; // null or '' to revoke
    const validRoles = ['Booking Manager', 'Feedback Manager', 'Vehicle Manager', 'Vehicle Validation Manager', 'Payment Manager', 'Report Handling Manager'];
    
    if (staffRole && !validRoles.includes(staffRole)) {
      return res.status(400).json({ message: 'Invalid staff role.' });
    }

    // Check current user — block if Car Owner
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) return res.status(404).json({ message: 'User not found.' });
    if (existingUser.role === 'Car Owner') {
      return res.status(400).json({ message: 'Cannot assign staff role to a Car Owner. Create a dedicated staff account instead.' });
    }

    const update = staffRole
      ? { role: 'Staff', staffRole }
      : { role: 'Customer', staffRole: null };

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    
    res.json({ message: staffRole ? `User promoted to ${staffRole}.` : 'Staff role revoked.', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating staff role.', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));