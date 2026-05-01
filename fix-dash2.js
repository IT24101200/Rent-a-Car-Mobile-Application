const fs = require('fs');
let content = fs.readFileSync('src/screens/owner/OwnerDashboardScreen.js', 'utf8');

// Find the first occurrence of "  const [bookings, setBookings] = useState([]);"
// and the second occurrence, and the junk in between.

const idx1 = content.indexOf('const [bookings, setBookings] = useState([]);');
const idx2 = content.indexOf('const [bookings, setBookings] = useState([]);', idx1 + 10);

if (idx1 !== -1 && idx2 !== -1) {
  content = content.substring(0, idx1) + content.substring(idx2);
  fs.writeFileSync('src/screens/owner/OwnerDashboardScreen.js', content);
  console.log('Fixed OwnerDashboardScreen duplication');
} else {
  console.log('Could not find duplicates');
}
