import sys

file_path = "src/app/events/[id]/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Fix getCardBg
for i, line in enumerate(lines):
    if 'case "confirmed":         return "#e8f1e9";' in line:
        lines[i] = '    case "confirmed":         return "#fff";\n'
        
# Fix the UI block
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '{/* Status + cost row */}' in line:
        start_idx = i
        break

if start_idx != -1:
    for i in range(start_idx, len(lines)):
        if '{/* Title */}' in lines[i]:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    new_block = '''          {/* Category + stage chips + cost row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {ev.categoryName && (
                <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.7)", border: "1px solid rgba(57, 41, 42, 0.28)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "transparent" }}>
                  {ev.categoryName}
                </span>
              )}
              {ev.stageAffinity && ev.stageAffinity !== "General" && (
                <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.7)", border: "1px solid rgba(57, 41, 42, 0.28)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "transparent" }}>
                  {ev.stageAffinity}
                </span>
              )}
              {ev.isSignature && (
                <span style={{ fontSize: "12px", color: "#7b5a00", border: "1px solid #d4a800", borderRadius: "12px", padding: "3px 10px", backgroundColor: "#fffbeb" }}>
                  {lang === "en" ? "Signature Moment" : "Signature Moment"}
                </span>
              )}
              {ev.guestPassEligible && (
                <span style={{ fontSize: "12px", color: "#456f04", border: "1px solid rgba(86,139,5,0.45)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(86,139,5,0.07)" }}>
                  {lang === "en" ? "Open to guests — €35" : "Abierto a invitadas — 35€"}
                </span>
              )}
            </div>
            
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 600, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "8px" }}>
              {ev.creditCost === 0 || ev.isFreeWalk
                ? (lang === "en" ? "Included" : "Incluido")
                : \\ \\}
            </div>
          </div>

'''
    
    lines = lines[:start_idx] + [new_block] + lines[end_idx:]
    
with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines)
    
print("Updated successfully")
