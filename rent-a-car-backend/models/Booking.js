const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  vehicle:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  additionalCharges: { type: Number, default: 0 },
  
  // booking lifecycle: pending -> confirmed -> active -> returning -> completed / cancelled
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'active', 'returning', 'completed', 'cancelled'], 
    default: 'confirmed' 
  },

  // Refund and Cancellation Tracking
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'issued'],
    default: 'none'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'bank_transfer'],
    default: 'cash'
  },
  paymentSlip: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'rejected', 'pending_extra_payment'],
    default: 'paid'
  },
  cancellationReason: {
    type: String
  },

  // Handover Accountability
  checkInDetails: {
    odometer: { type: Number },
    conditionPhoto: { type: String }, // URL to photo of dashboard/car taken at start
    time: { type: Date }
  },
  
  checkOutDetails: {
    odometer: { type: Number },
    conditionPhoto: { type: String }, // URL to photo of dashboard/car taken at end
    time: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
