const mongoose = require('mongoose');
const Booking = require('./models/Booking');

async function testV() {
  await mongoose.connect('mongodb://127.0.0.1:27017/RentACarDB');
  const recent = await Booking.find().sort({ createdAt: -1 }).limit(5);
  console.log(JSON.stringify(recent.map(b => ({
    id: b._id,
    status: b.status,
    created: b.createdAt
  })), null, 2));
  process.exit();
}
testV();
