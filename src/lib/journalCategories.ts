export interface JournalCategory {
  id: string;
  labelEn: string;
  labelEs: string;
  slug: string;
  descriptionEn?: string;
  descriptionEs?: string;
}

export const JOURNAL_CATEGORIES: JournalCategory[] = [
  {
    id: "postpartum",
    labelEn: "Postpartum",
    labelEs: "Posparto",
    slug: "postpartum",
    descriptionEn: "The fourth trimester, recovery, and early care.",
    descriptionEs: "El cuarto trimestre, recuperación y cuidados iniciales."
  },
  {
    id: "feeding",
    labelEn: "Feeding",
    labelEs: "Lactancia",
    slug: "feeding",
    descriptionEn: "Breastfeeding, bottles, and feeding support.",
    descriptionEs: "Lactancia materna, biberón y apoyo nutricional."
  },
  {
    id: "sleep",
    labelEn: "Sleep",
    labelEs: "Sueño",
    slug: "sleep",
    descriptionEn: "Developmental sleep rhythms and practical guidance.",
    descriptionEs: "Ritmos de sueño evolutivo y consejos prácticos."
  },
  {
    id: "body",
    labelEn: "Body & pregnancy",
    labelEs: "Cuerpo y embarazo",
    slug: "body",
    descriptionEn: "Pelvic floor, movement, and physical wellbeing.",
    descriptionEs: "Suelo pélvico, movimiento y bienestar físico."
  },
  {
    id: "friendship",
    labelEn: "Friendship",
    labelEs: "Amistad",
    slug: "friendship",
    descriptionEn: "Community, shared journeys, and motherhood bonds.",
    descriptionEs: "Comunidad, encuentros y vínculos de maternidad."
  },
  {
    id: "work",
    labelEn: "Work",
    labelEs: "Trabajo",
    slug: "work",
    descriptionEn: "Returning to work, career transitions, and balance.",
    descriptionEs: "Vuelta al trabajo, conciliación y cambios profesionales."
  },
  {
    id: "family",
    labelEn: "Family life",
    labelEs: "Vida familiar",
    slug: "family",
    descriptionEn: "Routines, siblings, and day-to-day rhythm.",
    descriptionEs: "Rutinas, hermanos y el día a día familiar."
  },
  {
    id: "city",
    labelEn: "Barcelona",
    labelEs: "Barcelona",
    slug: "city",
    descriptionEn: "Local guides, neighbourhood spots, and resources in Barcelona.",
    descriptionEs: "Guías locales, rincones de barrio y recursos en Barcelona."
  }
];

export const CATEGORY_IDS = JOURNAL_CATEGORIES.map((c) => c.id);

export function getCategoryById(id: string): JournalCategory | undefined {
  return JOURNAL_CATEGORIES.find((c) => c.id.toLowerCase() === id.toLowerCase());
}

export function getCategoryLabel(id: string, lang: "en" | "es" = "en"): string {
  const cat = getCategoryById(id);
  if (!cat) {
    // Fallback for legacy topics
    const legacyMap: Record<string, { en: string; es: string }> = {
      "pregnancy": { en: "Body & pregnancy", es: "Cuerpo y embarazo" },
      "the early months": { en: "Postpartum", es: "Posparto" },
      "family life": { en: "Family life", es: "Vida familiar" },
      "barcelona": { en: "Barcelona", es: "Barcelona" },
      "from the members": { en: "Friendship", es: "Amistad" }
    };
    const fallback = legacyMap[id.toLowerCase()];
    if (fallback) return lang === "es" ? fallback.es : fallback.en;
    return id;
  }
  return lang === "es" ? cat.labelEs : cat.labelEn;
}

export function normalizeCategoryId(topicOrCat?: string): string {
  if (!topicOrCat) return "family";
  const t = topicOrCat.trim().toLowerCase();
  if (t === "postpartum" || t === "the early months") return "postpartum";
  if (t === "feeding" || t === "lactancia") return "feeding";
  if (t === "sleep" || t === "sueño") return "sleep";
  if (t === "body" || t === "pregnancy" || t === "cuerpo y embarazo" || t === "body & pregnancy") return "body";
  if (t === "friendship" || t === "from the members" || t === "amistad") return "friendship";
  if (t === "work" || t === "trabajo") return "work";
  if (t === "family" || t === "family life" || t === "vida familiar") return "family";
  if (t === "city" || t === "barcelona") return "city";
  return t;
}
