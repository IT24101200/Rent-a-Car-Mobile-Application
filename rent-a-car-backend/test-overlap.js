require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

async function testV() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rent-a-car');
  
  const dummyVehicleId = new mongoose.Types.ObjectId();
  
  const b1 = await Booking.create({
    startDate: new Date('2025-05-01T12:00:00Z'),
    endDate: new Date('2025-05-02T12:00:00Z'),
    totalPrice: 100,
    vehicle: dummyVehicleId,
    user: new mongoose.Types.ObjectId(),
    status: 'confirmed'
  });

  const start = new Date('2025-05-01T15:00:00Z');
  const end = new Date('2025-05-02T15:00:00Z');

  const conflict = await Booking.findOne({
    vehicle: dummyVehicleId,
    status: { $in: ['confirmed', 'active', 'returning'] },
    $or: [
      { startDate: { $lt: end },  endDate: { $gt: start } },
    ],
  });

  console.log('Test Conflict Found?:', !!conflict);

  await Booking.deleteMany({ vehicle: dummyVehicleId });
  process.exit();
}

testV();
