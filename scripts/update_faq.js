const fs = require('fs');
const path = 'src/app/admin/faq/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state variables
code = code.replace(
    /  const \[draftAes, setDraftAes\] = useState\(""\);/g,
    '  const [draftAes, setDraftAes] = useState("");\n  const [draftQfr, setDraftQfr] = useState("");\n  const [draftAfr, setDraftAfr] = useState("");'
);

code = code.replace(
    /  const \[editAes, setEditAes\] = useState\(""\);/g,
    '  const [editAes, setEditAes] = useState("");\n  const [editQfr, setEditQfr] = useState("");\n  const [editAfr, setEditAfr] = useState("");'
);

// 2. Add to handleSaveFaqCreate payload
code = code.replace(
    /      answerEs: draftAes\.trim\(\),\n      active: publishImmediately,/g,
    '      answerEs: draftAes.trim(),\n      questionFr: draftQfr.trim(),\n      answerFr: draftAfr.trim(),\n      active: publishImmediately,'
);

// 3. Reset draft state
code = code.replace(
    /      setDraftAes\(""\);\n      setDraftTried\(false\);/g,
    '      setDraftAes("");\n      setDraftQfr("");\n      setDraftAfr("");\n      setDraftTried(false);'
);

// 4. Populate edit state
code = code.replace(
    /      setEditAes\(f\.answerEs \|\| ""\);\n      setEditActive\(f\.active\);/g,
    '      setEditAes(f.answerEs || "");\n      setEditQfr(f.questionFr || "");\n      setEditAfr(f.answerFr || "");\n      setEditActive(f.active);'
);

// 5. Add to handleSaveEdit payload
code = code.replace(
    /      answerEs: editAes\.trim\(\),\n      active: finalActive,/g,
    '      answerEs: editAes.trim(),\n      questionFr: editQfr.trim(),\n      answerFr: editAfr.trim(),\n      active: finalActive,'
);

fs.writeFileSync(path, code);
console.log("Updated faq/page.tsx for FR states and payloads.");
