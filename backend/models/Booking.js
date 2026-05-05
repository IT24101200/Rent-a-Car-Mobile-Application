const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Core Relationship Links
  vehicle:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true }, // Links to the rented vehicle
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true }, // Links to the customer who made the booking
  
  // Temporal Details
  startDate:  { type: Date, required: true }, // The exact date/time the trip begins
  endDate:    { type: Date, required: true }, // The exact date/time the trip ends
  
  // Financial Details
  totalPrice: { type: Number, required: true }, // Base price calculated as (pricePerDay * days)
  additionalCharges: { type: Number, default: 0 }, // Penalties applied during check-out for late returns
  
  // State Machine Tracking
  // booking lifecycle: pending (awaiting payment) -> confirmed (paid) -> active (customer driving) -> returning (checkout initiated) -> completed (owner finalized) / cancelled (aborted)
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'active', 'returning', 'completed', 'cancelled'], 
    default: 'confirmed' 
  },

  // Refund and Cancellation Tracking
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'issued'], // Manages the lifecycle of returning funds for cancelled trips
    default: 'none'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'bank_transfer'],
    default: 'cash'
  },
  paymentSlip: {
    type: String // URL path storing the Multer-uploaded bank transfer receipt image
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'rejected', 'pending_extra_payment'], // "pending_extra_payment" is triggered if additionalCharges > 0 at checkout
    default: 'paid'
  },
  cancellationReason: {
    type: String // Text explanation provided by user or system when status becomes 'cancelled'
  },

  // Handover Accountability (Check-In)
  checkInDetails: {
    odometer: { type: Number }, // Vehicle mileage recorded at the start of the trip
    conditionPhoto: { type: String }, // URL to photo of dashboard/car taken at start
    time: { type: Date } // Exact timestamp when customer initiated check-in
  },
  
  // Handover Accountability (Check-Out)
  checkOutDetails: {
    odometer: { type: Number }, // Vehicle mileage recorded at the end of the trip
    conditionPhoto: { type: String }, // URL to photo of dashboard/car taken at end
    time: { type: Date } // Exact timestamp when customer initiated check-out
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
