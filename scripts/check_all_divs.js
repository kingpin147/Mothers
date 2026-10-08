const fs = require('fs');
const text = fs.readFileSync('src/app/admin/journal/JournalEditorModal.tsx', 'utf8');

const lines = text.split('\n');
let divCount = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div/g) || []).length;
    divCount += opens;
    divCount -= closes;
    if (divCount < 0) {
        console.log(`ERROR: divCount < 0 at line ${i + 1}`);
    }
}
console.log('Final divCount:', divCount);
