const fs = require('fs');

const path = 'src/app/admin/journal/JournalEditorModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace `) : (` that comes right before the ES block
code = code.replace(/\) : \(\s*<div style=\{\{ display: "flex", flexDirection: "column", gap: "16px" \}\}>\s*<div style=\{\{ borderBottom: "1px solid rgba\(123,31,44,0\.2\)", paddingBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" \}\}>\s*<span style=\{\{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: WINE \}\}>\s*Spanish Content \/ Contenido en Español/g, 
') : activeLang === "es" ? (\n            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>\n              <div style={{ borderBottom: "1px solid rgba(123,31,44,0.2)", paddingBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>\n                <span style={{ fontFamily: "\'Cormorant Garamond\', serif", fontWeight: 600, fontSize: "16px", color: WINE }}>\n                  Spanish Content / Contenido en Español');

fs.writeFileSync(path, code);
console.log("Fixed ES ternary safely");
