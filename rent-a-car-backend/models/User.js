const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['Customer', 'Car Owner', 'Admin', 'Staff'], default: 'Customer' },
  staffRole: { 
    type: String, 
    enum: ['Booking Manager', 'Feedback Manager', 'Vehicle Manager', 'Vehicle Validation Manager', 'Payment Manager', 'Report Handling Manager'],
    default: null 
  },
  status:   { type: String, enum: ['active', 'suspended'], default: 'active' },
  identity: {
    dlFront: { type: String },
    dlBack:  { type: String },
    nic:     { type: String },
    selfie:  { type: String },
    status:  { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
