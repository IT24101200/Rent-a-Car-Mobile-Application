const fs = require('fs');
const path = require('path');
const files = [
  'src/screens/owner/OwnerDashboardScreen.js',
  'src/screens/owner/OwnerVehiclesScreen.js'
];

files.forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  // Add the useTheme import alongside SHADOWS if not present
  if (!c.includes("import { useTheme }")) {
    c = c.replace(/import \{ SIZES, SHADOWS \} from '..\/..\/theme\/theme';/, 
      "import { SIZES, SHADOWS } from '../../theme/theme';\nimport { useTheme } from '../../context/ThemeContext';");
  }

  // Inject hook into component
  if (!c.includes('const { colors } = useTheme();')) {
    c = c.replace(/export default function (\w+)\(\{ navigation \}\) \{/, 
      "export default function $1({ navigation }) {\n  const { colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(colors), [colors]);");
  }

  // Convert StyleSheet.create to dynamic function
  c = c.replace(/const styles = StyleSheet\.create\(/, 'const getStyles = (C) => StyleSheet.create(');

  // Replace Hex Codes with C. mapping
  c = c.replace(/'#F8FAFC'|'#F1F5F9'/g, 'C.background');
  c = c.replace(/'#fff'|'#FFFFFF'|'#ffffff'|'#FFF'/g, 'C.surface');
  c = c.replace(/'#0F172A'|'#1E293B'|'#334155'/g, 'C.textPrimary');
  c = c.replace(/'#64748B'|'#475569'|'#94A3B8'/g, 'C.textSecondary');
  c = c.replace(/'#1E3A8A'|PRIMARY|'#2563EB'|'#3B82F6'/g, 'C.primary');
  c = c.replace(/'#DC2626'|'#EF4444'|'#FEE2E2'/g, 'C.error');
  c = c.replace(/'#D97706'|'#FEF3C7'|'#FFFBEB'/g, 'C.warning');
  c = c.replace(/'#10B981'|'#16A34A'|'#DCFCE7'/g, 'C.success');

  fs.writeFileSync(file, c);
  console.log('Mapped: ' + file);
});
