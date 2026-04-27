const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }, // auto-populated at creation
  rating:  { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true },

  // Owner reply
  ownerReply: {
    text:      { type: String, trim: true },
    repliedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
