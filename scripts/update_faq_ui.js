const fs = require('fs');

const path = 'src/app/admin/faq/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Draft French inputs
const draftSpanishBlockRegex = /(<div>\s*<label[\s\S]*?>\s*Question, in Spanish \(optional\)[\s\S]*?<\/div>\s*<\/div>)/;
const draftMatch = code.match(draftSpanishBlockRegex);
if (draftMatch) {
  let newCode = code.replace(
    /gridTemplateColumns: "1fr 1fr",\s*gap: "20px"/g,
    'gridTemplateColumns: "1fr 1fr 1fr", gap: "20px"'
  );
  
  const draftSpanishDivRegex = /(<div>\s*<label[\s\S]*?>\s*Question, in Spanish \(optional\)[\s\S]*?<\/div>)/;
  const draftDivMatch = newCode.match(draftSpanishDivRegex);
  if (draftDivMatch) {
    const frenchDiv = draftDivMatch[1]
      .replace(/Spanish/g, 'French')
      .replace(/español/g, 'français')
      .replace(/draftQes/g, 'draftQfr')
      .replace(/setDraftQes/g, 'setDraftQfr')
      .replace(/draftAes/g, 'draftAfr')
      .replace(/setDraftAes/g, 'setDraftAfr');
    
    newCode = newCode.replace(draftDivMatch[1], draftDivMatch[1] + '\\n              ' + frenchDiv);
  }
  code = newCode;
}

// Edit French inputs
const editSpanishDivRegex = /(<div[^>]*?>\s*<div[^>]*?>\s*Spanish\s*<\/div>[\s\S]*?value=\{editQes\}[\s\S]*?<\/div>)/;
const editDivMatch = code.match(editSpanishDivRegex);
if (editDivMatch) {
  const frenchEditDiv = editDivMatch[1]
    .replace(/Spanish/g, 'French')
    .replace(/editQes/g, 'editQfr')
    .replace(/setEditQes/g, 'setEditQfr')
    .replace(/editAes/g, 'editAfr')
    .replace(/setEditAes/g, 'setEditAfr')
    .replace(/Sin traducir — la página muestra el inglés/g, `Non traduit — la page affiche l'anglais`)
    .replace(/Sin traducir/g, 'Non traduit');

  code = code.replace(editDivMatch[1], editDivMatch[1] + '\\n' + frenchEditDiv);
}


// Question list row - ES display:
const esRowRegex = /(<div\s*style=\{\{\s*fontSize: "13\.5px",\s*lineHeight: 1\.6,\s*color: hasMissingEs \? AMBER : "rgba\(57,41,42,0\.72\)",\s*fontStyle: hasMissingEs \? "italic" : "normal",\s*marginBottom: "7px",\s*\}\}\s*>\s*\{hasMissingEs\s*\?\s*"Not translated — the page shows the English"\s*:\s*f\.questionEs\}\s*<\/div>)/;

const esRowMatch = code.match(esRowRegex);
if (esRowMatch) {
    let frRow = esRowMatch[1]
      .replace(/hasMissingEs/g, 'hasMissingFr')
      .replace(/f\.questionEs/g, 'f.questionFr');
    code = code.replace(esRowMatch[1], esRowMatch[1] + '\\n                            ' + frRow);
}

// Badge
const badgeRegex = /(\{hasMissingEs && \(\s*<span\s*style=\{\{\s*border: `1px solid \$\{AMBER\}`,\s*color: AMBER,\s*borderRadius: "3px",\s*padding: "3px 9px",\s*fontFamily: "'Cormorant Garamond', serif",\s*fontWeight: 600,\s*fontSize: "11px",\s*letterSpacing: "0\.1em",\s*textTransform: "uppercase",\s*\}\}\s*>\s*MISSING ES\s*<\/span>\s*\)\})/;
const badgeMatch = code.match(badgeRegex);
if (badgeMatch) {
    let frBadge = badgeMatch[1]
      .replace(/hasMissingEs/g, 'hasMissingFr')
      .replace(/MISSING ES/g, 'MISSING FR');
    code = code.replace(badgeMatch[1], badgeMatch[1] + '\\n                                ' + frBadge);
}

fs.writeFileSync(path, code);
console.log("Updated faq/page.tsx (UI) successfully.");
