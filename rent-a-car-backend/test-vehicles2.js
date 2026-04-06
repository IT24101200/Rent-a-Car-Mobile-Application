const axios = require('axios');
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

async function testV() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rent-a-car');
  const vehicles = await Vehicle.find({});
  console.log(JSON.stringify(vehicles, null, 2));
  process.exit();
}
testV();
