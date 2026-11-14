const fs = require('fs');

const content = fs.readFileSync('THE  MOTHERS (LAST VERSION)/Tech Brief.dc.html', 'utf8');

const sections = ['s11', 's12', 's13', 's14', 's15'];
sections.forEach(s => {
  const marker = 'id="' + s + '"';
  const idx = content.indexOf(marker);
  console.log('=== SECTION', s, 'at index', idx, '===');
  if (idx !== -1) {
    console.log(content.slice(idx, idx + 1200).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  }
});
