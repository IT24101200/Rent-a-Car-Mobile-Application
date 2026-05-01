const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  type:      { type: String, enum: ['revenue', 'bookings', 'vehicles', 'full'], default: 'full' },
  notes:     { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: [{
    filename:   { type: String },
    fileUrl:    { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  snapshot: {
    totalRevenue:      Number,
    totalBookings:     Number,
    totalVehicles:     Number,
    totalUsers:        Number,
    platformAvgRating: mongoose.Schema.Types.Mixed,
    totalReviews:      Number,
    statusBreakdown:   mongoose.Schema.Types.Mixed,
    topEarners:        [mongoose.Schema.Types.Mixed],
    topRated:          [mongoose.Schema.Types.Mixed],
    monthlyRevenue:    [mongoose.Schema.Types.Mixed],
    ratingDist:        [Number],
    ownerPerformance:  [mongoose.Schema.Types.Mixed]
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
