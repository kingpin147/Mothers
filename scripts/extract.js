const fs = require('fs');
const path = require('path');

const file = 'src/app/admin/journal/JournalEditorModal.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');
const snippet = lines.slice(750, 1050).join('\n');
fs.writeFileSync('snippet.tsx', snippet);
