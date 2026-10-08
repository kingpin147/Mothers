const fs = require('fs');

const path = 'src/app/admin/journal/JournalEditorModal.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the line that is exactly `          ) : (` right before the ES block.
// We know it is line 901 (index 900).
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === ') : (' && lines[i+1].includes('Spanish Content')) {
      // wait, "Spanish Content" is at line 905
  }
}
// Let's just modify line 901 (0-indexed 900)
if (lines[900] === '          ) : (') {
    lines[900] = '          ) : activeLang === "es" ? (';
}

fs.writeFileSync(path, lines.join('\n'));
console.log("Fixed ES ternary");
