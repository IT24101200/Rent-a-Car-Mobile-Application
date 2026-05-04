//mongodb models
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  // Basic Info
  makeAndModel:     { type: String, required: true },
  licensePlate:     { type: String, required: true, unique: true },
  pricePerDay:      { type: Number, required: true },
  priceUpdatedAt:   { type: Date, default: Date.now },
  
  // New Specifications (Optional for backward compatibility)
  type:             { type: String, enum: ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Van'] },
  transmission:     { type: String, enum: ['Automatic', 'Manual'] },
  fuelType:         { type: String, enum: ['Petrol', 'Diesel', 'Hybrid', 'EV'] },
  seats:            { type: Number },
  year:             { type: Number },
  features:         { type: String }, // e.g., "Bluetooth, Sunroof, AC"
  imageUrl:         { type: String }, // primary image (synced with images[0])
  images:           [{ type: String }], // array of all image URLs
  documents: [{
    docType:    { type: String, enum: ['revenueLicense', 'insurance', 'registration', 'fitness', 'priceJustification'] },
    fileUrl:    { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  

  // Status info
  isAvailable:      { type: Boolean, default: true },
  validationStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  owner:            { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
 

  // Validation tracking
  rejectionReason:  { type: String, trim: true },
  validationNote:   { type: String, trim: true },
  validatedAt:      { type: Date },
  validatedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Price Negotiation
  priceProposal: {
    proposedPrice: { type: Number },
    proposedBy: { type: String, enum: ['owner', 'admin'] },
    justificationDoc: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    createdAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);