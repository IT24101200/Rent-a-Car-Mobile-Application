const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

// ── Models (needed for cron job) ──────────────────────────────────
const Booking = require('./models/Booking');

const app = express();
app.use(cors());
app.use(express.json());

// ── Upload directory ──────────────────────────────────────────────
const { uploadsDir } = require('./middleware/uploadMiddleware');

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

// ═══════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════
app.use(require('./routes/authRoutes'));
app.use(require('./routes/userRoutes'));
app.use(require('./routes/vehicleRoutes'));
app.use(require('./routes/ownerRoutes'));
app.use(require('./routes/bookingRoutes'));
app.use(require('./routes/feedbackRoutes'));
app.use(require('./routes/analyticsRoutes'));
app.use(require('./routes/adminRoutes'));
app.use(require('./routes/reportRoutes'));

// ── Automated Booking Cancellations (Cron Job) ────────────────────────
const cron = require('node-cron');

// Runs every 15 minutes to check for no-shows
cron.schedule('*/15 * * * *', async () => {
  try {
    const gracePeriodThreshold = new Date(Date.now() - 60 * 60 * 1000);
    const expiredBookings = await Booking.find({
      status: 'confirmed',
      startDate: { $lt: gracePeriodThreshold }
    });

    if (expiredBookings.length > 0) {
      console.log(`[CRON] Found ${expiredBookings.length} expired bookings. Triggering automated cancellations...`);
      for (const booking of expiredBookings) {
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

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Rent-A-Car Backend API' });
});

// ── Error Handling ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
