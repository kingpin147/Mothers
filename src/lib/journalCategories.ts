export interface JournalCategory {
  id: string;
  labelEn: string;
  labelEs: string;
  labelFr?: string;
  slug: string;
  descriptionEn?: string;
  descriptionEs?: string;
  descriptionFr?: string;
}

export const JOURNAL_CATEGORIES: JournalCategory[] = [
  {
    id: "postpartum",
    labelEn: "Postpartum",
    labelEs: "Posparto",
    labelFr: "Post-partum",
    slug: "postpartum",
    descriptionEn: "The fourth trimester, recovery, and early care.",
    descriptionEs: "El cuarto trimestre, recuperación y cuidados iniciales.",
    descriptionFr: "Le quatrième trimestre, la récupération et les premiers soins.",
  },
  {
    id: "feeding",
    labelEn: "Feeding",
    labelEs: "Lactancia",
    labelFr: "Allaitement",
    slug: "feeding",
    descriptionEn: "Breastfeeding, bottles, and feeding support.",
    descriptionEs: "Lactancia materna, biberón y apoyo nutricional.",
    descriptionFr: "Allaitement, biberon et accompagnement.",
  },
  {
    id: "sleep",
    labelEn: "Sleep",
    labelEs: "Sueño",
    labelFr: "Sommeil",
    slug: "sleep",
    descriptionEn: "Developmental sleep rhythms and practical guidance.",
    descriptionEs: "Ritmos de sueño evolutivo y consejos prácticos.",
    descriptionFr: "Rythmes de sommeil évolutifs et conseils pratiques.",
  },
  {
    id: "body",
    labelEn: "Body & pregnancy",
    labelEs: "Cuerpo y embarazo",
    labelFr: "Corps et grossesse",
    slug: "body",
    descriptionEn: "Pelvic floor, movement, and physical wellbeing.",
    descriptionEs: "Suelo pélvico, movimiento y bienestar físico.",
    descriptionFr: "Périnée, mouvement et bien-être physique.",
  },
  {
    id: "friendship",
    labelEn: "Friendship",
    labelEs: "Amistad",
    labelFr: "Amitié",
    slug: "friendship",
    descriptionEn: "Community, shared journeys, and motherhood bonds.",
    descriptionEs: "Comunidad, encuentros y vínculos de maternidad.",
    descriptionFr: "Communauté, parcours partagés et liens de maternité.",
  },
  {
    id: "work",
    labelEn: "Work",
    labelEs: "Trabajo",
    labelFr: "Travail",
    slug: "work",
    descriptionEn: "Returning to work, career transitions, and balance.",
    descriptionEs: "Vuelta al trabajo, conciliación y cambios profesionales.",
    descriptionFr: "Reprise du travail, transitions professionnelles et équilibre.",
  },
  {
    id: "family",
    labelEn: "Family life",
    labelEs: "Vida familiar",
    labelFr: "Vie de famille",
    slug: "family",
    descriptionEn: "Routines, siblings, and day-to-day rhythm.",
    descriptionEs: "Rutinas, hermanos y el día a día familiar.",
    descriptionFr: "Routines, fratrie et rythme du quotidien.",
  },
  {
    id: "city",
    labelEn: "Barcelona",
    labelEs: "Barcelona",
    labelFr: "Barcelone",
    slug: "city",
    descriptionEn: "Local guides, neighbourhood spots, and resources in Barcelona.",
    descriptionEs: "Guías locales, rincones de barrio y recursos en Barcelona.",
    descriptionFr: "Guides locaux, bonnes adresses de quartier et ressources à Barcelone.",
  }
];

export const CATEGORY_IDS = JOURNAL_CATEGORIES.map((c) => c.id);

export function getCategoryById(id: string): JournalCategory | undefined {
  return JOURNAL_CATEGORIES.find((c) => c.id.toLowerCase() === id.toLowerCase());
}

export function getCategoryLabel(id: string, lang: "en" | "es" | "fr" = "en"): string {
  const cat = getCategoryById(id);
  if (!cat) {
    // Fallback for legacy topics
    const legacyMap: Record<string, { en: string; es: string; fr: string }> = {
      "pregnancy": { en: "Body & pregnancy", es: "Cuerpo y embarazo", fr: "Corps et grossesse" },
      "the early months": { en: "Postpartum", es: "Posparto", fr: "Post-partum" },
      "family life": { en: "Family life", es: "Vida familiar", fr: "Vie de famille" },
      "barcelona": { en: "Barcelona", es: "Barcelona", fr: "Barcelone" },
      "from the members": { en: "Friendship", es: "Amistad", fr: "Amitié" }
    };
    const fallback = legacyMap[id.toLowerCase()];
    if (fallback) return lang === "fr" ? fallback.fr : lang === "es" ? fallback.es : fallback.en;
    return id;
  }
  return lang === "fr" ? (cat.labelFr || cat.labelEn) : lang === "es" ? cat.labelEs : cat.labelEn;
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
