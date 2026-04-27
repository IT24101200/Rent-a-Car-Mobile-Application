const fs = require('fs');
const path = require('path');

function checkDir(d) {
  fs.readdirSync(d).forEach(f => {
    let p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      checkDir(p);
    } else if (p.endsWith('.js')) {
      let c = fs.readFileSync(p, 'utf8');
      if (c.includes('greenHeader')) {
        let changed = false;
        
        let newC = c.replace(/subtitle:\s*\{\s*color:\s*C\.textSecondary,/g, match => {
          changed = true;
          return "subtitle: { color: 'rgba(255,255,255,0.7)',";
        });
        
        newC = newC.replace(/subtitle:\s*\{\s*fontSize:\s*14,\s*color:\s*C\.textSecondary,/g, match => {
          changed = true;
          return "subtitle:      { fontSize: 14, color: 'rgba(255,255,255,0.7)',";
        });

        newC = newC.replace(/headerSubtitle:\s*\{\s*color:\s*C\.textSecondary,/g, match => {
          changed = true;
          return "headerSubtitle:     { color: 'rgba(255,255,255,0.7)',";
        });

        newC = newC.replace(/headerTitle:\s*\{\s*fontSize:\s*24,\s*fontWeight:\s*'900',\s*color:\s*C\.textPrimary,/g, match => {
          changed = true;
          return "headerTitle:        { fontSize: 24, fontWeight: '900', color: '#FFFFFF',";
        });
        
        // Fix KYCUpload backbtn
        newC = newC.replace(/backBtn:\s*\{\s*fontSize:\s*22,\s*color:\s*C\.primary,\s*fontWeight:\s*'700'\s*\}/g, match => {
          changed = true;
          return "backBtn:            { fontSize: 22, color: '#FFFFFF', fontWeight: '700' }";
        });

        // AddVehicleScreen vaultSubtitle
        newC = newC.replace(/vaultSubtitle:\s*\{\s*fontSize:\s*13,\s*color:\s*COLORS\.textSecondary,/g, match => {
          changed = true;
          return "vaultSubtitle:   { fontSize: 13, color: 'rgba(255,255,255,0.7)',";
        });

        if (changed) {
          fs.writeFileSync(p, newC);
          console.log('Fixed text colors in:', p);
        }
      }
    }
  });
}

checkDir('src/screens');
console.log('Done fixing text colors');
