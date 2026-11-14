import fs from "fs";
import path from "path";
import {
  SupportedLocale,
  normalizeLocale,
  normalizeTemplateBaseName,
  evaluateConditionals,
  interpolateVariables,
  extractSubjectFromHtml,
} from "./email-parser";

export * from "./email-parser";

/**
 * Resolves the absolute path for an email template according to locale with fallback.
 * Priority for "fr": .fr.html -> .html
 * Priority for "es": .es.html -> .html
 * Priority for "en": .html
 */
export function getTemplateFilePath(templateName: string, locale: SupportedLocale = "en"): string | null {
  const cleanBase = normalizeTemplateBaseName(templateName);

  const extensions: string[] = [];
  if (locale === "fr") {
    extensions.push(".fr.html", ".html");
  } else if (locale === "es") {
    extensions.push(".es.html", ".html");
  } else {
    extensions.push(".html");
  }

  const searchDirs = [
    path.join(process.cwd(), "public", "emails"),
    path.join(process.cwd(), "emails-for-tech"),
  ];

  for (const ext of extensions) {
    const filename = `${cleanBase}${ext}`;
    for (const dir of searchDirs) {
      const fullPath = path.join(dir, filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

export interface RenderEmailResult {
  html: string;
  subject: string;
  locale: SupportedLocale;
  templateFile: string;
}

/**
 * Main server-side rendering function: resolves language template, processes conditionals,
 * interpolates placeholders, and extracts default subject line.
 */
export function renderEmailTemplate(
  templateName: string,
  variables: Record<string, any> = {},
  localeInput?: string | null
): RenderEmailResult {
  const locale = normalizeLocale(localeInput);
  const filePath = getTemplateFilePath(templateName, locale);

  if (!filePath) {
    console.warn(`[email-renderer] Template not found: "${templateName}" for locale "${locale}"`);
    return {
      html: "",
      subject: "The Mothers",
      locale,
      templateFile: "",
    };
  }

  try {
    const rawContent = fs.readFileSync(filePath, "utf8");

    // 1. Process conditionals: {{#if key}}...{{else}}...{{/if}}
    let processed = evaluateConditionals(rawContent, variables);

    // 2. Interpolate variables: {{key}}
    processed = interpolateVariables(processed, variables);

    // 3. Extract subject from <title> if present
    const subject = extractSubjectFromHtml(processed);

    return {
      html: processed,
      subject,
      locale,
      templateFile: path.basename(filePath),
    };
  } catch (err) {
    console.error(`[email-renderer] Error rendering template "${templateName}":`, err);
    return {
      html: "",
      subject: "The Mothers",
      locale,
      templateFile: filePath ? path.basename(filePath) : "",
    };
  }
}
