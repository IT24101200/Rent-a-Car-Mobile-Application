const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, enum: ['info', 'warning', 'penalty', 'success'], default: 'info' },
  read:    { type: Boolean, default: false },
  linkTo:  { type: String } // optional route or identifier to navigate to
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
