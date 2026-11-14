const fs = require('fs');
const path = require('path');

const briefPath = path.join('THE  MOTHERS (LAST VERSION)', 'Tech Brief.dc.html');
const content = fs.readFileSync(briefPath, 'utf8');

const marker = '15. What’s new since 1 November';
const startIdx = content.indexOf(marker);

if (startIdx === -1) {
  console.log('Marker not found');
  process.exit(1);
}

// Find where Section 15 ends (e.g. next section or footer)
const slice = content.substring(startIdx, startIdx + 20000);
const clean = slice
  .replace(/<\/(div|p|h\d|li|tr|section)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&euro;/g, '€')
  .replace(/&ndash;/g, '–')
  .replace(/&mdash;/g, '—')
  .replace(/&bull;/g, '•')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n+/g, '\n');

console.log(clean);
