require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const b = new Booking({
      vehicle: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      startDate: new Date(),
      endDate: new Date(Date.now() + 100000),
      totalPrice: "5000",
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending',
      paymentSlip: '/uploads/test.jpg',
      status: 'confirmed'
    });
    await b.validate();
    console.log("Validation passed");
  } catch (err) {
    console.error("Validation error:", err);
  }
  process.exit();
}
run();
