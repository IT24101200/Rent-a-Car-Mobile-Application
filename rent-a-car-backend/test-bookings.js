const mongoose = require('mongoose');
const Booking = require('./models/Booking');

async function testV() {
  await mongoose.connect('mongodb://127.0.0.1:27017/RentACarDB');
  
  const now = new Date();
  
  console.log('--- Current Time ---');
  console.log('Now:', now.toISOString());

  const bookings = await Booking.find({});
  
  console.log('--- ALL BOOKINGS ---');
  console.log(JSON.stringify(bookings.map(b => ({
    id: b._id,
    vehicle: b.vehicle,
    status: b.status,
    start: b.startDate.toISOString(),
    startUTC: b.startDate,
    end: b.endDate.toISOString(),
    endUTC: b.endDate
  })), null, 2));

  const activeBookings = await Booking.find({
    status: { $in: ['confirmed', 'active', 'returning'] },
    startDate: { $lte: now },
    endDate: { $gt: now }
  });
  
  console.log('--- OVERLAPPING BOOKINGS ---');
  console.log(activeBookings.length);
  
  process.exit();
}
testV();
