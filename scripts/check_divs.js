const fs = require('fs');
const text = fs.readFileSync('snippet.tsx', 'utf8');

const lines = text.split('\n');
let divCount = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div/g) || []).length;
    divCount += opens;
    divCount -= closes;
    console.log(`${i + 750}: ${divCount} | ${line.trim()}`);
}
