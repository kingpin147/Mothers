const fs = require('fs');

const path = 'src/app/admin/journal/JournalEditorModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace literal "\n" strings with actual newlines
code = code.replace(/\\n/g, '\n');

fs.writeFileSync(path, code);
console.log("Fixed literal newlines in JournalEditorModal.tsx");
