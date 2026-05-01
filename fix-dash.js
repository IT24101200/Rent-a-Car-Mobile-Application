const fs = require('fs');
let content = fs.readFileSync('src/screens/owner/OwnerDashboardScreen.js', 'utf8');

// Add detailModal state
content = content.replace(
  'const [verifying, setVerifying] = useState(false);',
  'const [verifying, setVerifying] = useState(false);\n  const [detailModal, setDetailModal] = useState(null);'
);

// Update renderItem to use TouchableOpacity
content = content.replace(
  'renderItem={({ item }) => (\n          <View style={styles.card}>',
  'renderItem={({ item }) => (\n          <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => setDetailModal(item)}>'
);

// Close TouchableOpacity instead of View
content = content.replace(
  '            )}\n          </View>\n        )}\n      />',
  '            )}\n          </TouchableOpacity>\n        )}\n      />'
);

// Add the Detail Modal JSX
const detailModalJSX = `
      {/* ─── Detail Modal ─────────────────────────────────────── */}
      {detailModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: '85%' }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>📋 Trip Details</Text>
                
                <Text style={styles.ratingLabel}>Vehicle</Text>
                <Text style={styles.detailValueText}>{detailModal.vehicle?.makeAndModel || 'Unknown'} {detailModal.vehicle?.licensePlate ? \`(\${detailModal.vehicle.licensePlate})\` : ''}</Text>

                <Text style={styles.ratingLabel}>Renter</Text>
                <Text style={styles.detailValueText}>{detailModal.user?.name} — {detailModal.user?.email}</Text>

                <Text style={styles.ratingLabel}>Dates</Text>
                <Text style={styles.detailValueText}>{new Date(detailModal.startDate).toLocaleDateString()} → {new Date(detailModal.endDate).toLocaleDateString()}</Text>

                <Text style={styles.ratingLabel}>Total Payout</Text>
                <Text style={[styles.detailValueText, { color: C.success, fontWeight: '900', fontSize: 20 }]}>Rs. {(detailModal.totalPrice || 0).toLocaleString()}</Text>

                {detailModal.checkInDetails?.time && (
                  <>
                    <Text style={styles.ratingLabel}>Check-In Details</Text>
                    <Text style={styles.detailValueText}>🕐 {new Date(detailModal.checkInDetails.time).toLocaleString()}</Text>
                    <Text style={styles.detailValueText}>📟 Odometer: {detailModal.checkInDetails.odometer} km</Text>
                  </>
                )}

                {detailModal.checkOutDetails?.time && (
                  <>
                    <Text style={styles.ratingLabel}>Check-Out Details</Text>
                    <Text style={styles.detailValueText}>🕐 {new Date(detailModal.checkOutDetails.time).toLocaleString()}</Text>
                    <Text style={styles.detailValueText}>📟 Odometer: {detailModal.checkOutDetails.odometer} km</Text>
                    {detailModal.checkOutDetails.conditionPhoto && (
                      <View style={{marginTop: 8}}>
                        <Text style={{fontSize: 12, color: C.textSecondary, marginBottom: 4}}>Condition Photo:</Text>
                        <Image source={{ uri: \`\${api.defaults.baseURL || 'http://localhost:5000'}\${detailModal.checkOutDetails.conditionPhoto}\` }} style={{width: 150, height: 100, borderRadius: 8, backgroundColor: C.surfaceHighlight}} resizeMode="cover" />
                      </View>
                    )}
                  </>
                )}

                <Text style={styles.ratingLabel}>Booking ID</Text>
                <Text style={[styles.detailValueText, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }]}>{detailModal._id}</Text>
                <View style={{ height: 20 }} />
              </ScrollView>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDetailModal(null)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
`;

content = content.replace(
  '        </Modal>\n      )}\n    </View>',
  '        </Modal>\n      )}\n' + detailModalJSX + '\n    </View>'
);

// Make sure TouchableOpacity and ScrollView are imported if not
if (!content.includes('ScrollView,')) content = content.replace('RefreshControl,', 'RefreshControl, ScrollView,');
if (!content.includes('Modal,')) content = content.replace('ScrollView,', 'ScrollView, Modal,');
if (!content.includes('Image,')) content = content.replace('ScrollView,', 'ScrollView, Image,');
if (!content.includes('Platform,')) content = content.replace('ScrollView,', 'ScrollView, Platform,');

fs.writeFileSync('src/screens/owner/OwnerDashboardScreen.js', content);
console.log('OwnerDashboardScreen updated.');
