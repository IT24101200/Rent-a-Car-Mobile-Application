const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }, // auto-populated at creation
  rating:  { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true },
  photos:  [{ type: String }], // Array of image URLs (max 3)

  // Owner reply
  ownerReply: {
    text:      { type: String, trim: true },
    repliedAt: { type: Date }
  },

  // Moderation
  flagged:   { type: Boolean, default: false },
  adminNote: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
