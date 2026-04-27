const fs = require('fs');
let c = fs.readFileSync('src/screens/owner/OwnerDashboardScreen.js', 'utf8');

// Match with \r\n endings
const broken = 'renderItem={({ item }) => (\r\n                <Text style={styles.detailText}>{item.user?.name} ({item.user?.email})</Text>';

const fixed = 'renderItem={({ item }) => (\r\n          <View style={styles.card}>\r\n            <View style={styles.cardHeader}>\r\n              <View>\r\n                <Text style={styles.vehicleName}>{item.vehicle?.makeAndModel || \'Unknown Vehicle\'}</Text>\r\n                <Text style={styles.licenseText}>{item.vehicle?.licensePlate}</Text>\r\n              </View>\r\n              <View style={[styles.statusBadge, \r\n                item.status === \'completed\' ? { backgroundColor: C.surfaceHighlight } : \r\n                item.status === \'cancelled\' ? { backgroundColor: C.errorBg } : \r\n                item.status === \'returning\' ? { backgroundColor: C.warningBg } : \r\n                { backgroundColor: C.successBg }\r\n              ]}>\r\n                <Text style={[styles.badgeText, \r\n                  item.status === \'completed\' ? { color: C.textSecondary } : \r\n                  item.status === \'cancelled\' ? { color: C.error } : \r\n                  item.status === \'returning\' ? { color: C.warning } : \r\n                  { color: C.success }\r\n                ]}>\r\n                  {item.status.toUpperCase()}\r\n                </Text>\r\n              </View>\r\n            </View>\r\n            \r\n            <View style={styles.metaBox}>\r\n              <View style={styles.metaRow}>\r\n                <Text style={styles.detailTitle}>Renter:</Text>\r\n                <Text style={styles.detailText}>{item.user?.name} ({item.user?.email})</Text>';

if (c.includes(broken)) {
  c = c.replace(broken, fixed);
  fs.writeFileSync('src/screens/owner/OwnerDashboardScreen.js', c);
  console.log('SUCCESS');
} else {
  console.log('MISS - trying line-by-line approach');
  // Split into lines and find the renderItem line
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('renderItem={({ item })')) {
      console.log('Found renderItem at line', i+1, ':', JSON.stringify(lines[i]));
      console.log('Next line:', JSON.stringify(lines[i+1]));
      
      // Insert the missing lines after renderItem line
      const insertBlock = [
        '          <View style={styles.card}>',
        '            <View style={styles.cardHeader}>',
        '              <View>',
        '                <Text style={styles.vehicleName}>{item.vehicle?.makeAndModel || \'Unknown Vehicle\'}</Text>',
        '                <Text style={styles.licenseText}>{item.vehicle?.licensePlate}</Text>',
        '              </View>',
        '              <View style={[styles.statusBadge, ',
        '                item.status === \'completed\' ? { backgroundColor: C.surfaceHighlight } : ',
        '                item.status === \'cancelled\' ? { backgroundColor: C.errorBg } : ',
        '                item.status === \'returning\' ? { backgroundColor: C.warningBg } : ',
        '                { backgroundColor: C.successBg }',
        '              ]}>',
        '                <Text style={[styles.badgeText, ',
        '                  item.status === \'completed\' ? { color: C.textSecondary } : ',
        '                  item.status === \'cancelled\' ? { color: C.error } : ',
        '                  item.status === \'returning\' ? { color: C.warning } : ',
        '                  { color: C.success }',
        '                ]}>',
        '                  {item.status.toUpperCase()}',
        '                </Text>',
        '              </View>',
        '            </View>',
        '            ',
        '            <View style={styles.metaBox}>',
        '              <View style={styles.metaRow}>',
        '                <Text style={styles.detailTitle}>Renter:</Text>',
      ];
      
      // The next line is the orphaned detailText - keep it
      lines.splice(i + 1, 0, ...insertBlock);
      
      const result = lines.join('\n');
      fs.writeFileSync('src/screens/owner/OwnerDashboardScreen.js', result);
      console.log('SUCCESS via line splice');
      break;
    }
  }
}
