export type SupportedLocale = "en" | "es" | "fr";

export function normalizeLocale(locale?: string | null): SupportedLocale {
  if (!locale) return "en";
  const lower = locale.toLowerCase().trim();
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("fr")) return "fr";
  return "en";
}

/**
 * Normalizes template base name (e.g. "Receipt", "Email - Receipt", "Email - Receipt.html" -> "Email - Receipt")
 */
export function normalizeTemplateBaseName(rawName: string): string {
  let clean = rawName.trim().replace(/\.(es|fr)?\.html$/i, "");
  if (!clean.toLowerCase().startsWith("email - ")) {
    clean = `Email - ${clean}`;
  }
  return clean;
}

/**
 * Evaluates {{#if key}}...{{else}}...{{/if}} and {{#if key}}...{{/if}} blocks
 */
export function evaluateConditionals(content: string, data: Record<string, any>): string {
  let prev = "";
  let current = content;

  let safety = 0;
  while (current !== prev && safety < 20) {
    safety++;
    prev = current;
    current = current.replace(
      /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
      (_, key, thenBlock, elseBlock = "") => {
        const val = data[key];
        const isTruthy = Boolean(
          val !== undefined &&
          val !== null &&
          val !== false &&
          val !== "" &&
          val !== "0" &&
          val !== 0 &&
          (!Array.isArray(val) || val.length > 0)
        );
        return isTruthy ? thenBlock : elseBlock;
      }
    );
  }

  return current;
}

/**
 * Replaces {{variable}} placeholders with values from data
 */
export function interpolateVariables(content: string, data: Record<string, any>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const val = data[key];
      return val !== null && val !== undefined ? String(val) : "";
    }
    return "";
  });
}

/**
 * Extracts title from HTML <title> tag and unescapes standard entities
 */
export function extractSubjectFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (match && match[1]) {
    return match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
  return "The Mothers";
}
