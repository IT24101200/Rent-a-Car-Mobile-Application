const axios = require('axios');
const mongoose = require('mongoose');

async function testV() {
  try {
    // Generate valid future dates WAY IN THE FUTURE
    const startDate = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 103 * 24 * 60 * 60 * 1000).toISOString();
    
    // Pick vehicle:
    await mongoose.connect('mongodb://127.0.0.1:27017/RentACarDB');
    const Vehicle = require('./models/Vehicle');
    const vehicle = await Vehicle.findOne({});
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: new mongoose.Types.ObjectId(), email: 'sys@test.com', role: 'Customer' }, 'driveease_super_secret_key_2024', { expiresIn: '1h' });

    console.log('Testing Booking POST...');
    const res = await axios.post('http://localhost:5000/api/bookings', {
      vehicleId: vehicle._id.toString(),
      startDate,
      endDate,
      totalPrice: 10000,
      status: 'confirmed'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Success!', res.data._id);
  } catch (err) {
    console.error('Error:', err.response?.data?.message || err.message);
  }
  process.exit();
}
testV();
