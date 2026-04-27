const fs = require('fs');
let c = fs.readFileSync('src/screens/owner/OwnerDashboardScreen.js', 'utf8');

c = c.replace('const C.primary = C.primary;', '');

if (!c.includes('const C = colors;')) {
  c = c.replace('const { colors } = useTheme();', 'const { colors } = useTheme();\n  const C = colors;');
}

const statCardDefRegex = /\/\/ Sleek, minimal Stat Card\s+const StatCard = \(\{ title, value, icon, bgColor, textColor \}\) => \(\s+<View style=\{\[styles\.statCard, \{ backgroundColor: bgColor \}\]\}>\s+<View style=\{styles\.statHeader\}>\s+<Text style=\{\[styles\.statTitle, \{ color: textColor \}\]\}>\{title\}<\/Text>\s+<Text style=\{\[styles\.statIcon, \{ color: textColor \}\]\}>\{icon\}<\/Text>\s+<\/View>\s+<Text style=\{\[styles\.statValue, \{ color: textColor \}\]\}>\{value\}<\/Text>\s+<\/View>\s+\);/;

const statCardDef = `// Sleek, minimal Stat Card
  const StatCard = ({ title, value, icon, bgColor, textColor }) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={styles.statHeader}>
        <Text style={[styles.statTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.statIcon, { color: textColor }]}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    </View>
  );`;

// remove from top
c = c.replace(statCardDefRegex, '');

// insert into component
c = c.replace('const styles = React.useMemo(() => getStyles(colors), [colors]);', 'const styles = React.useMemo(() => getStyles(colors), [colors]);\n\n  ' + statCardDef);

c = c.replace(
  /headerContainer: \{ backgroundColor: C\.surface, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 4, marginBottom: 20, shadowColor: '#000', shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.05, shadowRadius: 10 \},/,
  'greenHeader:     { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 4, marginBottom: 20 },'
);
c = c.replace(/color: C\.textPrimary, paddingHorizontal: 20, paddingTop: 20, marginBottom: 16/, 'color: \'#FFFFFF\'');
c = c.replace(/borderRadius: 20, marginRight: 12, elevation: 6, shadowColor: '#000', shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.1, shadowRadius: 8/, 'borderRadius: SIZES.radius + 8, marginRight: 12, elevation: 6, borderWidth: 1, borderColor: C.border');
c = c.replace(/style=\{styles\.headerContainer\}/g, 'style={styles.greenHeader}');
c = c.replace(/borderRadius: 20, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: C\.background/, 'borderRadius: SIZES.radius + 8, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: C.border');

fs.writeFileSync('src/screens/owner/OwnerDashboardScreen.js', c);
console.log('Fixed OwnerDashboardScreen.js');
