const fs = require('fs');
let c = fs.readFileSync('src/screens/owner/OwnerVehiclesScreen.js', 'utf8');

// Normalize to \n for matching
let n = c.replace(/\r\n/g, '\n');

const oldWarning = `              <Text style={styles.modalTitle}>✏️ Edit Vehicle</Text>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Edits will reset status to <Text style={{fontWeight: '700'}}>Pending</Text> and require Admin approval again.
                </Text>
              </View>`;

const newWarning = `              <Text style={styles.modalTitle}>✏️ Edit Vehicle</Text>
              {editingVehicle?.validationStatus === 'accepted' ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Changing vehicle name, plate, photo, or documents will reset approval to <Text style={{fontWeight: '700'}}>Pending</Text>. Price and feature changes apply instantly.
                  </Text>
                </View>
              ) : (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    Edits will keep status as <Text style={{fontWeight: '700'}}>Pending</Text> and require Admin approval.
                  </Text>
                </View>
              )}`;

if (n.includes(oldWarning)) {
  n = n.replace(oldWarning, newWarning);
  // Restore \r\n
  fs.writeFileSync('src/screens/owner/OwnerVehiclesScreen.js', n.replace(/\n/g, '\r\n'));
  console.log('SUCCESS: Warning banner updated');
} else {
  console.log('FAIL: Pattern not found');
  // Debug
  const idx = n.indexOf('Edit Vehicle');
  if (idx > -1) console.log('Context:', JSON.stringify(n.substring(idx - 20, idx + 300)));
}
