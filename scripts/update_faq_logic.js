const fs = require('fs');

const path = 'src/app/admin/faq/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add states
code = code.replace(/  const \[draftAes, setDraftAes\] = useState\(""\);\n/, '  const [draftAes, setDraftAes] = useState("");\n  const [draftQfr, setDraftQfr] = useState("");\n  const [draftAfr, setDraftAfr] = useState("");\n');
code = code.replace(/  const \[editAes, setEditAes\] = useState\(""\);\n/, '  const [editAes, setEditAes] = useState("");\n  const [editQfr, setEditQfr] = useState("");\n  const [editAfr, setEditAfr] = useState("");\n');

// Missing counts logic
code = code.replace(/const missingEsCount = faqs.filter\(\(f\) => !f.questionEs \|\| f.questionEs.trim\(\) === ""\).length;\n/g, '  const missingEsCount = faqs.filter((f) => !f.questionEs || f.questionEs.trim() === "").length;\n  const missingFrCount = faqs.filter((f) => !f.questionFr || f.questionFr.trim() === "").length;\n');

// Update filter
code = code.replace(/if \(statusFilter === "missing"\) statusMatched = !f.questionEs \|\| f.questionEs.trim\(\) === "";/g, 'if (statusFilter === "missing") statusMatched = (!f.questionEs || f.questionEs.trim() === "") || (!f.questionFr || f.questionFr.trim() === "");');

// Search string
code = code.replace(/\`\$\{f.questionEn\} \$\{f.answerEn\} \$\{f.questionEs \|\| ""\} \$\{f.answerEs \|\| ""\}\`/g, '`${f.questionEn} ${f.answerEn} ${f.questionEs || ""} ${f.answerEs || ""} ${f.questionFr || ""} ${f.answerFr || ""}`');

// saveFaq payload (draft)
code = code.replace(/      questionEs: draftQes.trim\(\),\n      answerEs: draftAes.trim\(\),\n/g, '      questionEs: draftQes.trim(),\n      answerEs: draftAes.trim(),\n      questionFr: draftQfr.trim(),\n      answerFr: draftAfr.trim(),\n');

// reset draft
code = code.replace(/      setDraftAes\(""\);\n/g, '      setDraftAes("");\n      setDraftQfr("");\n      setDraftAfr("");\n');

// Set edit fields
code = code.replace(/      setEditAes\(f.answerEs \|\| ""\);\n/g, '      setEditAes(f.answerEs || "");\n      setEditQfr(f.questionFr || "");\n      setEditAfr(f.answerFr || "");\n');

// saveFaq payload (edit)
code = code.replace(/      questionEs: editQes.trim\(\),\n      answerEs: editAes.trim\(\),\n/g, '      questionEs: editQes.trim(),\n      answerEs: editAes.trim(),\n      questionFr: editQfr.trim(),\n      answerFr: editAfr.trim(),\n');

// swapGroup (reorder logic)
// There are two occurrences in toggle order up/down
code = code.replace(/      questionEs: sameGroup\[idx\]\.questionEs,\n      answerEs: sameGroup\[idx\]\.answerEs,\n/g, '      questionEs: sameGroup[idx].questionEs,\n      answerEs: sameGroup[idx].answerEs,\n      questionFr: sameGroup[idx].questionFr,\n      answerFr: sameGroup[idx].answerFr,\n');
code = code.replace(/      questionEs: sameGroup\[swapIdx\]\.questionEs,\n      answerEs: sameGroup\[swapIdx\]\.answerEs,\n/g, '      questionEs: sameGroup[swapIdx].questionEs,\n      answerEs: sameGroup[swapIdx].answerEs,\n      questionFr: sameGroup[swapIdx].questionFr,\n      answerFr: sameGroup[swapIdx].answerFr,\n');


// Find missing items logic in render list
code = code.replace(/const hasMissingEs = !f.questionEs \|\| f.questionEs.trim\(\) === "";/g, 'const hasMissingEs = !f.questionEs || f.questionEs.trim() === "";\n                    const hasMissingFr = !f.questionFr || f.questionFr.trim() === "";');


fs.writeFileSync(path, code);
console.log("Updated faq/page.tsx (logic) successfully.");
