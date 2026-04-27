// Phase 2: Update header JSX references + header style definitions
const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');

// Files already manually redesigned
const SKIP = ['LoginScreen.js', 'RegisterScreen.js', 'HomeScreen.js'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const basename = path.basename(filePath);
  if (SKIP.includes(basename)) return;

  let changed = false;
  const original = content;

  // 1. Replace <View style={styles.header}> with <View style={styles.greenHeader}>
  content = content.replace(/<View style=\{styles\.header\}>/g, '<View style={styles.greenHeader}>');

  // 2. Replace header: { ... } style definition with greenHeader pattern
  // Match header style that uses marginBottom and paddingTop
  content = content.replace(
    /header:\s*\{[^}]*marginBottom[^}]*\}/g,
    "greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 }"
  );

  // 3. Update title to white on green in style definitions
  content = content.replace(
    /title:\s*\{([^}]*?)color:\s*C\.textPrimary/g,
    "title: {$1color: '#FFFFFF'"
  );

  // 4. Update sub/subtitle to white-translucent
  content = content.replace(
    /sub:\s*\{([^}]*?)color:\s*C\.textSecondary/g,
    "sub: {$1color: 'rgba(255,255,255,0.7)'"
  );

  // 5. Replace remaining borderRadius: 12 with SIZES.radius
  content = content.replace(/borderRadius: 12/g, 'borderRadius: SIZES.radius');

  // 6. Replace color: C.surface in button text with '#FFFFFF'
  content = content.replace(/color: C\.surface/g, "color: '#FFFFFF'");

  // 7. Fix title letterSpacing for green header
  content = content.replace(
    /title:\s*\{([^}]*?)letterSpacing:\s*-1/g,
    "title: {$1letterSpacing: -0.5"
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', basename);
    changed = true;
  }
}

function walkDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkDir(full);
    else if (item.endsWith('.js')) processFile(full);
  }
}

walkDir(screensDir);
console.log('Phase 2 done!');
