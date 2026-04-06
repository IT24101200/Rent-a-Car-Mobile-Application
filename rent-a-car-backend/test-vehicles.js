const axios = require('axios');

async function testV() {
  try {
    const res = await axios.get('http://localhost:5000/api/vehicles');
    console.log(JSON.stringify(res.data.map(v => ({
      id: v._id,
      name: v.makeAndModel,
      isCurrentlyBooked: v.isCurrentlyBooked
    })), null, 2));
  } catch (err) {
    console.error(err.message);
  }
}
testV();
