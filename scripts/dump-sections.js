const fs = require('fs');

const content = fs.readFileSync('THE  MOTHERS (LAST VERSION)/Tech Brief.dc.html', 'utf8');

function printSection(id, nextId) {
  const start = content.indexOf('id="' + id + '"');
  const end = nextId ? content.indexOf('id="' + nextId + '"') : content.length;
  console.log(`\n============================= FULL SECTION ${id} =============================\n`);
  const text = content.slice(start, end).replace(/<[^>]+>/g, '\n').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  console.log(text);
}

printSection('s11', 's12');
printSection('s12', 's13');
printSection('s13', 's14');
printSection('s14', 's10');
