const fs = require('fs');
const file = 'src/app/events/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace getCardBg
content = content.replace(
  /function getCardBg\(status: string\) \{[\s\S]*?default:\s*return "#fff";\s*\}\s*\}/,
  \unction getCardBg(status: string) {
  switch (status) {
    case "cancelled":         return "#fbf1f1";
    case "completed":         return "#e9eaea";
    default:                  return "#fff";
  }
}\
);

// Replace the top of the main card
const searchStr = \{/* Status + cost row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ backgroundColor: statusLabel.bg, color: statusLabel.color, fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "5px 12px", borderRadius: "4px", border: \\\1px solid \44\\\ }}>
              {lang === "en" ? statusLabel.en : statusLabel.es}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 600, color: "var(--color-accent)" }}>
              {ev.creditCost === 0 || ev.isFreeWalk
                ? (lang === "en" ? "Included with membership" : "Incluido con membresía")
                : \\\\ \\\\}
              {ev.guestPassEligible && \\\ · \\\\}
            </span>
          </div>

          {/* Category + stage chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>\;

const replaceStr = \{/* Category + stage chips + cost row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>\;

content = content.replace(searchStr, replaceStr);

// Add the cost to the end of the category chips
const searchStr2 = \              <span style={{ fontSize: "12px", color: "#456f04", border: "1px solid rgba(86,139,5,0.45)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(86,139,5,0.07)" }}>
                {lang === "en" ? "Open to guests — €35" : "Abierto a invitadas — 35€"}
              </span>
            )}
          </div>\;

const replaceStr2 = \              <span style={{ fontSize: "12px", color: "#456f04", border: "1px solid rgba(86,139,5,0.45)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(86,139,5,0.07)" }}>
                {lang === "en" ? "Open to guests — €35" : "Abierto a invitadas — 35€"}
              </span>
            )}
            </div>
            
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 600, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "8px" }}>
              {ev.creditCost === 0 || ev.isFreeWalk
                ? (lang === "en" ? "Included" : "Incluido")
                : \\\\ \\\\}
              {ev.guestPassEligible && \\\ · \\\\}
            </div>
          </div>\;

content = content.replace(searchStr2, replaceStr2);

fs.writeFileSync(file, content);
console.log('done');
