const fs = require('fs');
const path = 'src/app/actions/adminCms.ts';
let code = fs.readFileSync(path, 'utf8');

// Update saveJournalPostSchema
code = code.replace(/  titleEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  titleEs: z.string().optional(),$1  titleFr: z.string().optional(),$1');
code = code.replace(/  excerptEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  excerptEs: z.string().optional(),$1  excerptFr: z.string().optional(),$1');
code = code.replace(/  bodyEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  bodyEs: z.string().optional(),$1  bodyFr: z.string().optional(),$1');
code = code.replace(/  quoteEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  quoteEs: z.string().optional(),$1  quoteFr: z.string().optional(),$1');
code = code.replace(/  authorRoleEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  authorRoleEs: z.string().optional(),$1  authorRoleFr: z.string().optional(),$1');
code = code.replace(/  bylineEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  bylineEs: z.string().optional(),$1  bylineFr: z.string().optional(),$1');
code = code.replace(/  reviewedNoteEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  reviewedNoteEs: z.string().optional(),$1  reviewedNoteFr: z.string().optional(),$1');
code = code.replace(/  seoTitleEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  seoTitleEs: z.string().optional(),$1  seoTitleFr: z.string().optional(),$1');
code = code.replace(/  seoDescriptionEs: z\.string\(\)\.optional\(\),(\r?\n)/g, '  seoDescriptionEs: z.string().optional(),$1  seoDescriptionFr: z.string().optional(),$1');

// Update saveJournalPost function signature
code = code.replace(/  titleEs\?: string;(\r?\n)/g, '  titleEs?: string;$1  titleFr?: string;$1');
code = code.replace(/  excerptEs\?: string;(\r?\n)/g, '  excerptEs?: string;$1  excerptFr?: string;$1');
code = code.replace(/  bodyEs\?: string;(\r?\n)/g, '  bodyEs?: string;$1  bodyFr?: string;$1');
code = code.replace(/  quoteEs\?: string;(\r?\n)/g, '  quoteEs?: string;$1  quoteFr?: string;$1');
code = code.replace(/  authorRoleEs\?: string;(\r?\n)/g, '  authorRoleEs?: string;$1  authorRoleFr?: string;$1');
code = code.replace(/  bylineEs\?: string;(\r?\n)/g, '  bylineEs?: string;$1  bylineFr?: string;$1');
code = code.replace(/  reviewedNoteEs\?: string;(\r?\n)/g, '  reviewedNoteEs?: string;$1  reviewedNoteFr?: string;$1');
code = code.replace(/  seoTitleEs\?: string;(\r?\n)/g, '  seoTitleEs?: string;$1  seoTitleFr?: string;$1');
code = code.replace(/  seoDescriptionEs\?: string;(\r?\n)/g, '  seoDescriptionEs?: string;$1  seoDescriptionFr?: string;$1');

fs.writeFileSync(path, code);
console.log("Updated adminCms.ts for JournalPost schema and signature");
