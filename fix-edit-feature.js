const fs = require('fs');

// Fix 1: Replace action row to show Edit for all vehicles
let c = fs.readFileSync('src/screens/owner/OwnerVehiclesScreen.js', 'utf8');

// Find and replace the action row block
const oldActionRow = `              <View style={styles.actionRow}>
                {item.validationStatus === 'accepted' ? (
                  <TouchableOpacity
                    style={[styles.btn, item.isAvailable ? styles.btnSuspend : styles.btnActivate, actionId === item._id && { opacity: 0.5 }]}
                    onPress={() => toggleAvailability(item)}
                    disabled={actionId === item._id}
                  >
                    <Text style={styles.btnText}>{item.isAvailable ? 'Hide from Customers' : 'Make Available'}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.btnGroupRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnEdit, actionId === item._id && { opacity: 0.5 }]}
                      onPress={() => openEditModal(item)}
                      disabled={actionId === item._id}
                    >
                      <Text style={[styles.btnText, { color: C.textPrimary }]}>\u270f\ufe0f Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <TouchableOpacity
                  style={[styles.btn, styles.btnDelete, actionId === item._id && { opacity: 0.5 }]}
                  onPress={() => confirmDelete(item._id)}
                  disabled={actionId === item._id}
                >
                  <Text style={styles.btnText}>\ud83d\uddd1\ufe0f</Text>
                </TouchableOpacity>
              </View>`;

const newActionRow = `              <View style={styles.actionRow}>
                {item.validationStatus === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.btn, item.isAvailable ? styles.btnSuspend : styles.btnActivate, actionId === item._id && { opacity: 0.5 }]}
                    onPress={() => toggleAvailability(item)}
                    disabled={actionId === item._id}
                  >
                    <Text style={styles.btnText}>{item.isAvailable ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.btn, styles.btnEdit, actionId === item._id && { opacity: 0.5 }]}
                  onPress={() => openEditModal(item)}
                  disabled={actionId === item._id}
                >
                  <Text style={[styles.btnText, { color: C.textPrimary }]}>\u270f\ufe0f Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.btn, styles.btnDelete, actionId === item._id && { opacity: 0.5 }]}
                  onPress={() => confirmDelete(item._id)}
                  disabled={actionId === item._id}
                >
                  <Text style={styles.btnText}>\ud83d\uddd1\ufe0f</Text>
                </TouchableOpacity>
              </View>`;

// Normalize line endings for matching
const normalizedContent = c.replace(/\r\n/g, '\n');
const normalizedOld = oldActionRow.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedOld)) {
  c = normalizedContent.replace(normalizedOld, newActionRow.replace(/\r\n/g, '\n'));
  // Restore original line endings
  c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync('src/screens/owner/OwnerVehiclesScreen.js', c);
  console.log('Step 1 SUCCESS: Action row updated');
} else {
  console.log('Step 1 FAIL: Pattern not found');
  // Debug: show what's there
  const idx = normalizedContent.indexOf('actionRow');
  if (idx > -1) console.log('Context:', normalizedContent.substring(idx, idx + 100));
}

// Fix 2: Update saveEdit success message
c = fs.readFileSync('src/screens/owner/OwnerVehiclesScreen.js', 'utf8');
const oldMsg = "Alert.alert('Success', 'Vehicle updated. Pending admin approval.');";
const newMsg = `const msg = res.data.validationStatus === 'pending'
        ? 'Vehicle updated. Critical fields changed \\u2014 pending admin re-approval.'
        : 'Vehicle updated successfully!';
      Alert.alert('Success', msg);`;

if (c.includes(oldMsg)) {
  c = c.replace(oldMsg, newMsg);
  fs.writeFileSync('src/screens/owner/OwnerVehiclesScreen.js', c);
  console.log('Step 2 SUCCESS: Alert message updated');
} else {
  console.log('Step 2 FAIL: Alert pattern not found');
}

// Fix 3: Add warning banner in edit modal for accepted vehicles
c = fs.readFileSync('src/screens/owner/OwnerVehiclesScreen.js', 'utf8');
const modalTitleLine = "<Text style={styles.modalTitle}>Edit Vehicle</Text>";
const warningBanner = `<Text style={styles.modalTitle}>Edit Vehicle</Text>

            {editingVehicle?.validationStatus === 'accepted' && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>\u26a0\ufe0f Changing the vehicle name, plate, photo, or documents will reset approval to "Pending" and temporarily hide it from customers.</Text>
              </View>
            )}`;

if (c.includes(modalTitleLine)) {
  c = c.replace(modalTitleLine, warningBanner);
  fs.writeFileSync('src/screens/owner/OwnerVehiclesScreen.js', c);
  console.log('Step 3 SUCCESS: Warning banner added');
} else {
  console.log('Step 3 FAIL: Modal title pattern not found');
}
