const fs = require('fs');

const path = 'src/app/admin/journal/JournalEditorModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Fr to JournalPostPayload interface
code = code.replace(
  /  titleEs\?: string \| null;\n/g,
  "  titleEs?: string | null;\n  titleFr?: string | null;\n"
);
code = code.replace(/  excerptEs\?: string \| null;\n/g, "  excerptEs?: string | null;\n  excerptFr?: string | null;\n");
code = code.replace(/  bodyEs\?: string \| null;\n/g, "  bodyEs?: string | null;\n  bodyFr?: string | null;\n");
code = code.replace(/  quoteEs\?: string \| null;\n/g, "  quoteEs?: string | null;\n  quoteFr?: string | null;\n");
code = code.replace(/  authorRoleEs\?: string \| null;\n/g, "  authorRoleEs?: string | null;\n  authorRoleFr?: string | null;\n");
code = code.replace(/  bylineEs\?: string \| null;\n/g, "  bylineEs?: string | null;\n  bylineFr?: string | null;\n");
code = code.replace(/  reviewedNoteEs\?: string \| null;\n/g, "  reviewedNoteEs?: string | null;\n  reviewedNoteFr?: string | null;\n");
code = code.replace(/  seoTitleEs\?: string \| null;\n/g, "  seoTitleEs?: string | null;\n  seoTitleFr?: string | null;\n");
code = code.replace(/  seoDescriptionEs\?: string \| null;\n/g, "  seoDescriptionEs?: string | null;\n  seoDescriptionFr?: string | null;\n");

// 2. Add activeLang type
code = code.replace(
  /const \[activeLang, setActiveLang\] = useState<"en" \| "es">\("en"\);/,
  'const [activeLang, setActiveLang] = useState<"en" | "es" | "fr">("en");'
);

// 3. Add states
const esStatesRegex = /  const \[seoDescriptionEs, setSeoDescriptionEs\] = useState\(""\);/;
code = code.replace(esStatesRegex, `  const [seoDescriptionEs, setSeoDescriptionEs] = useState("");
  // French fields
  const [titleFr, setTitleFr] = useState("");
  const [excerptFr, setExcerptFr] = useState("");
  const [bodyFr, setBodyFr] = useState("");
  const [quoteFr, setQuoteFr] = useState("");
  const [authorRoleFr, setAuthorRoleFr] = useState("");
  const [bylineFr, setBylineFr] = useState("");
  const [reviewedNoteFr, setReviewedNoteFr] = useState("Informations générales, pas de conseils médicaux ou légaux.");
  const [seoTitleFr, setSeoTitleFr] = useState("");
  const [seoDescriptionFr, setSeoDescriptionFr] = useState("");
`);

// 4. Update useEffect post init
code = code.replace(/      setTitleEs\(post.titleEs \|\| ""\);\n/g, '      setTitleEs(post.titleEs || "");\n      setTitleFr(post.titleFr || "");\n');
code = code.replace(/      setExcerptEs\(post.excerptEs \|\| ""\);\n/g, '      setExcerptEs(post.excerptEs || "");\n      setExcerptFr(post.excerptFr || "");\n');
code = code.replace(/      setBodyEs\(post.bodyEs \|\| ""\);\n/g, '      setBodyEs(post.bodyEs || "");\n      setBodyFr(post.bodyFr || "");\n');
code = code.replace(/      setQuoteEs\(post.quoteEs \|\| ""\);\n/g, '      setQuoteEs(post.quoteEs || "");\n      setQuoteFr(post.quoteFr || "");\n');
code = code.replace(/      setAuthorRoleEs\(post.authorRoleEs \|\| ""\);\n/g, '      setAuthorRoleEs(post.authorRoleEs || "");\n      setAuthorRoleFr(post.authorRoleFr || "");\n');
code = code.replace(/      setBylineEs\(post.bylineEs \|\| ""\);\n/g, '      setBylineEs(post.bylineEs || "");\n      setBylineFr(post.bylineFr || "");\n');
code = code.replace(/      setReviewedNoteEs\(post.reviewedNoteEs \|\| "Información general, no consejo médico ni legal."\);\n/g, '      setReviewedNoteEs(post.reviewedNoteEs || "Información general, no consejo médico ni legal.");\n      setReviewedNoteFr(post.reviewedNoteFr || "Informations générales, pas de conseils médicaux ou légaux.");\n');
code = code.replace(/      setSeoTitleEs\(post.seoTitleEs \|\| ""\);\n/g, '      setSeoTitleEs(post.seoTitleEs || "");\n      setSeoTitleFr(post.seoTitleFr || "");\n');
code = code.replace(/      setSeoDescriptionEs\(post.seoDescriptionEs \|\| ""\);\n/g, '      setSeoDescriptionEs(post.seoDescriptionEs || "");\n      setSeoDescriptionFr(post.seoDescriptionFr || "");\n');

// 5. Update useEffect reset
code = code.replace(/      setTitleEs\(""\);\n/g, '      setTitleEs("");\n      setTitleFr("");\n');
code = code.replace(/      setExcerptEs\(""\);\n/g, '      setExcerptEs("");\n      setExcerptFr("");\n');
code = code.replace(/      setBodyEs\(""\);\n/g, '      setBodyEs("");\n      setBodyFr("");\n');
code = code.replace(/      setQuoteEs\(""\);\n/g, '      setQuoteEs("");\n      setQuoteFr("");\n');
code = code.replace(/      setAuthorRoleEs\(""\);\n/g, '      setAuthorRoleEs("");\n      setAuthorRoleFr("");\n');
code = code.replace(/      setBylineEs\(""\);\n/g, '      setBylineEs("");\n      setBylineFr("");\n');
code = code.replace(/      setReviewedNoteEs\("Información general, no consejo médico ni legal."\);\n/g, '      setReviewedNoteEs("Información general, no consejo médico ni legal.");\n      setReviewedNoteFr("Informations générales, pas de conseils médicaux ou légaux.");\n');
code = code.replace(/      setSeoTitleEs\(""\);\n/g, '      setSeoTitleEs("");\n      setSeoTitleFr("");\n');
code = code.replace(/      setSeoDescriptionEs\(""\);\n/g, '      setSeoDescriptionEs("");\n      setSeoDescriptionFr("");\n');

// 6. Update save call
code = code.replace(/      titleEs: titleEs.trim\(\) \|\| undefined,\n/g, '      titleEs: titleEs.trim() || undefined,\n      titleFr: titleFr.trim() || undefined,\n');
code = code.replace(/      excerptEs: excerptEs.trim\(\) \|\| undefined,\n/g, '      excerptEs: excerptEs.trim() || undefined,\n      excerptFr: excerptFr.trim() || undefined,\n');
code = code.replace(/      bodyEs: bodyEs.trim\(\) \|\| undefined,\n/g, '      bodyEs: bodyEs.trim() || undefined,\n      bodyFr: bodyFr.trim() || undefined,\n');
code = code.replace(/      quoteEs: quoteEs.trim\(\) \|\| undefined,\n/g, '      quoteEs: quoteEs.trim() || undefined,\n      quoteFr: quoteFr.trim() || undefined,\n');
code = code.replace(/      authorRoleEs: authorRoleEs.trim\(\) \|\| undefined,\n/g, '      authorRoleEs: authorRoleEs.trim() || undefined,\n      authorRoleFr: authorRoleFr.trim() || undefined,\n');
code = code.replace(/      bylineEs: bylineEs.trim\(\) \|\| undefined,\n/g, '      bylineEs: bylineEs.trim() || undefined,\n      bylineFr: bylineFr.trim() || undefined,\n');
code = code.replace(/      reviewedNoteEs: reviewedNoteEs.trim\(\) \|\| undefined,\n/g, '      reviewedNoteEs: reviewedNoteEs.trim() || undefined,\n      reviewedNoteFr: reviewedNoteFr.trim() || undefined,\n');
code = code.replace(/      seoTitleEs: seoTitleEs.trim\(\) \|\| undefined,\n/g, '      seoTitleEs: seoTitleEs.trim() || undefined,\n      seoTitleFr: seoTitleFr.trim() || undefined,\n');
code = code.replace(/      seoDescriptionEs: seoDescriptionEs.trim\(\) \|\| undefined,\n/g, '      seoDescriptionEs: seoDescriptionEs.trim() || undefined,\n      seoDescriptionFr: seoDescriptionFr.trim() || undefined,\n');

// 7. Add French tab button
const esTabRegex = /(<button[^>]*?onClick=\{\(\) => setActiveLang\("es"\)\}[^>]*?>[\s\S]*?<\/button>)/;
const esTabMatch = code.match(esTabRegex);
if (esTabMatch) {
  let frTab = esTabMatch[1].replace(/"es"/g, '"fr"').replace(/ES/g, 'FR').replace(/activeLang === "es"/g, 'activeLang === "fr"');
  code = code.replace(esTabMatch[1], esTabMatch[1] + '\\n              ' + frTab);
}

// 8. Edit content ternary
const contentTernaryRegex = /(<div style=\{\{ display: "flex", flexDirection: "column", gap: "16px" \}\}>\s*<div style=\{\{ borderBottom: "1px solid rgba\(123,31,44,0\.2\)", paddingBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" \}\}>\s*<span style=\{\{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: WINE \}\}>\s*Spanish Content \/ Contenido en Español\s*<\/span>[\s\S]*?Nota de Revisión en Español[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/;

const contentMatch = code.match(contentTernaryRegex);
if (contentMatch) {
  let frContent = contentMatch[1]
    .replace(/Spanish Content \/ Contenido en Español/g, 'French Content / Contenu en Français')
    .replace(/Visible al cambiar idioma a Español/g, 'Visible en mode Français')
    .replace(/Título en Español/g, 'Titre en Français')
    .replace(/titleEs/g, 'titleFr')
    .replace(/setTitleEs/g, 'setTitleFr')
    .replace(/Subtítulo \/ Dek en Español/g, 'Sous-titre / Dek en Français')
    .replace(/excerptEs/g, 'excerptFr')
    .replace(/setExcerptEs/g, 'setExcerptFr')
    .replace(/Cita Destacada \(Pull Quote en Español\)/g, 'Citation en Français')
    .replace(/quoteEs/g, 'quoteFr')
    .replace(/setQuoteEs/g, 'setQuoteFr')
    .replace(/Cuerpo del Artículo en Español/g, "Corps de l'article en Français")
    .replace(/bodyEs/g, 'bodyFr')
    .replace(/setBodyEs/g, 'setBodyFr')
    .replace(/Rol \/ Especialidad en Español/g, "Rôle / Spécialité en Français")
    .replace(/authorRoleEs/g, 'authorRoleFr')
    .replace(/setAuthorRoleEs/g, 'setAuthorRoleFr')
    .replace(/Byline \/ Firma en Español/g, 'Signature en Français')
    .replace(/bylineEs/g, 'bylineFr')
    .replace(/setBylineEs/g, 'setBylineFr')
    .replace(/Nota de Revisión en Español/g, 'Note de Révision en Français')
    .replace(/reviewedNoteEs/g, 'reviewedNoteFr')
    .replace(/setReviewedNoteEs/g, 'setReviewedNoteFr');

  code = code.replace(contentMatch[1], contentMatch[1] + '\\n          ) : activeLang === "fr" ? (\\n            ' + frContent);
}

// 9. SEO Accordion
// The SEO part has ES inputs. Let's just add FR inputs right next to them in the grid.
code = code.replace(/gridTemplateColumns: "1fr 1fr"/g, 'gridTemplateColumns: "1fr 1fr 1fr"');

const seoTitleEsRegex = /(<div>\s*<label[^>]*?>SEO Title \(ES\)<\/label>\s*<input[\s\S]*?value=\{seoTitleEs\}[\s\S]*?<\/div>)/;
const seoTitleMatch = code.match(seoTitleEsRegex);
if (seoTitleMatch) {
  let seoTitleFr = seoTitleMatch[1]
    .replace(/SEO Title \(ES\)/, 'SEO Title (FR)')
    .replace(/seoTitleEs/, 'seoTitleFr')
    .replace(/setSeoTitleEs/, 'setSeoTitleFr')
    .replace(/Título para Google/, 'Titre pour Google');
  code = code.replace(seoTitleMatch[1], seoTitleMatch[1] + '\\n                  ' + seoTitleFr);
}

const seoDescEsRegex = /(<div>\s*<label[^>]*?>SEO Description \(ES\)<\/label>\s*<textarea[\s\S]*?value=\{seoDescriptionEs\}[\s\S]*?<\/div>)/;
const seoDescMatch = code.match(seoDescEsRegex);
if (seoDescMatch) {
  let seoDescFr = seoDescMatch[1]
    .replace(/SEO Description \(ES\)/, 'SEO Description (FR)')
    .replace(/seoDescriptionEs/, 'seoDescriptionFr')
    .replace(/setSeoDescriptionEs/, 'setSeoDescriptionFr')
    .replace(/Meta descripción en español/, 'Méta-description en français');
  code = code.replace(seoDescMatch[1], seoDescMatch[1] + '\\n                  ' + seoDescFr);
}

fs.writeFileSync(path, code);
console.log("Updated JournalEditorModal.tsx successfully (safe).");
