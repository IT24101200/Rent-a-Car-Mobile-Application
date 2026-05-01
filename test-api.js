require('dotenv').config({ path: './rent-a-car-backend/.env' });
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./rent-a-car-backend/models/User');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ role: 'customer' });
    if (!user) return console.log("No customer");
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    console.log("Logged in as", user.email);

    // 2. Fetch a vehicle
    const vehicleRes = await axios.get('http://localhost:5000/api/vehicles');
    const vehicle = vehicleRes.data[0];
    if (!vehicle) {
      console.log("No vehicles found");
      return;
    }

    // 3. Create dummy file
    fs.writeFileSync('dummy.jpg', 'fake image data');

    // 4. Send FormData
    const form = new FormData();
    form.append('vehicleId', vehicle._id);
    form.append('startDate', new Date(Date.now() + 86400000).toISOString()); // tomorrow
    form.append('endDate', new Date(Date.now() + 86400000 * 2).toISOString());
    form.append('totalPrice', 5000);
    form.append('paymentMethod', 'bank_transfer');
    form.append('paymentSlip', fs.createReadStream('dummy.jpg'));

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    };

    const res = await axios.post('http://localhost:5000/api/bookings', form, config);
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR STATUS:", err.response?.status);
    console.log("ERROR DATA:", err.response?.data);
  }
  process.exit();
}
test();
