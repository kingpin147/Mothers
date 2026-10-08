const fs = require('fs');

const path = 'src/app/admin/journal/JournalEditorModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// The faulty string is `) : activeLang === "fr" ? (`
// Let's replace it with `) : (` so it serves as the fallback for "fr"
code = code.replace(/\) : activeLang === "fr" \? \(/g, ') : (');

fs.writeFileSync(path, code);
console.log("Fixed ternary syntax in JournalEditorModal.tsx");
