"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { getPublicJournalArticle, incrementJournalPostViews } from "@/app/actions/adminCms";
import { getCategoryLabel } from "@/lib/journalCategories";

interface ArticleData {
  id: string;
  slug: string;
  cat: string;
  dateEn: string;
  dateEs: string;
  readEn: string;
  readEs: string;
  author: string;
  roleEn: string;
  roleEs: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  titleEn: string;
  titleEs: string;
  dekEn: string;
  dekEs: string;
  quoteEn?: string;
  quoteEs?: string;
  bodyEn: string[];
  bodyEs: string[];
  bodyAfterEn: string[];
  bodyAfterEs: string[];
  bylineEn: string;
  bylineEs: string;
  reviewedNoteEn: string;
  reviewedNoteEs: string;
  audience: string;
}

const STATIC_SEEDS: Record<string, ArticleData> = {
  doula: {
    id: "doula",
    slug: "doula",
    cat: "postpartum",
    dateEn: "Aug 4, 2026",
    dateEs: "4 ago 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "Marta Vidal",
    roleEn: "postpartum doula, Eixample",
    roleEs: "doula posparto, Eixample",
    heroImageUrl: "/assets/journal-doula.jpg",
    heroImageAlt: "A doula and mother sitting together at a kitchen table, natural light",
    titleEn: "Finding a postpartum doula in Barcelona",
    titleEs: "Encontrar una doula posparto en Barcelona",
    dekEn: "What a doula actually does in the fourth trimester, what it costs here, and the questions worth asking before you book one.",
    dekEs: "Qué hace realmente una doula en el cuarto trimestre, cuánto cuesta aquí y qué conviene preguntar antes de contratarla.",
    quoteEn: "Ask her what she does when a mother cries. The answer tells you more than any certificate.",
    quoteEs: "Pregúntale qué hace cuando una madre llora. La respuesta dice más que cualquier certificado.",
    bodyEn: [
      "A postpartum doula is not a night nurse, not a cleaner, and not a midwife. She is someone who comes to your home in the weeks after birth and takes the weight off — the practical weight and the emotional one. In Barcelona she will usually work in blocks of three or four hours, once or twice a week, for the first six to twelve weeks.",
      "What that looks like in practice is unglamorous and enormously useful. She holds the baby while you shower. She watches you feed and notices the things you cannot see from where you are sitting. She cooks something you can eat with one hand. She tells you what is normal, which is the sentence most new mothers are starving for.",
      "Rates in the city sit broadly between €25 and €45 an hour, higher for overnight support, and many doulas sell packages rather than single visits. Ask what is included: some include a prenatal meeting and unlimited WhatsApp support between visits, which is often worth more than an extra hour in the house.",
      "Where to look, in rough order of usefulness: your midwife at the CAP, who often knows who works in your neighbourhood; the associations that certify doulas in Catalonia; your antenatal group; and lastly Instagram, where the presentation is polished and the vetting is yours to do.",
    ],
    bodyEs: [
      "Una doula posparto no es una enfermera de noche, ni una limpiadora, ni una matrona. Es alguien que viene a tu casa en las semanas posteriores al parto y te quita peso — el práctico y el emocional. En Barcelona suele trabajar en bloques de tres o cuatro horas, una o dos veces por semana, durante las primeras seis a doce semanas.",
      "En la práctica es poco glamuroso y enormemente útil. Sostiene al bebé mientras te duchas. Te mira dar el pecho y ve lo que tú no puedes ver desde donde estás sentada. Cocina algo que puedas comer con una mano. Te dice qué es normal, que es la frase que más necesita oír una madre reciente.",
      "Las tarifas en la ciudad van más o menos de 25€ a 45€ la hora, más caro de noche, y muchas doulas venden paquetes en lugar de visitas sueltas. Pregunta qué incluye: algunas incluyen una visita prenatal y WhatsApp ilimitado entre sesiones, que a menudo vale más que una hora extra en casa.",
      "Dónde buscar, por orden de utilidad: tu matrona del CAP, que suele saber quién trabaja en tu barrio; las asociaciones que acreditan doulas en Cataluña; tu grupo de preparación al parto; y por último Instagram, donde la presentación es impecable y el filtro lo pones tú.",
    ],
    bodyAfterEn: [
      "Three questions worth asking on the first call. What does a typical visit look like, hour by hour? What do you not do — is laundry in scope, are older siblings? And who covers you if you are ill on the day?",
      "One practical note: book earlier than feels necessary. Good doulas in Barcelona are often full six to eight weeks ahead, and the version of you who needs one is not the version of you with the energy to interview four strangers.",
    ],
    bodyAfterEs: [
      "Tres preguntas para la primera llamada. ¿Cómo es una visita típica, hora a hora? ¿Qué no haces — entra la colada, entra la de los hermanos mayores? ¿Y quién te cubre si ese día estás enferma?",
      "Un apunte práctico: reserva antes de lo que parece necesario. Las buenas doulas en Barcelona suelen estar llenas con seis u ocho semanas de antelación, y la versión de ti que la necesitará no es la que tiene energía para entrevistar a cuatro desconocidas.",
    ],
    bylineEn: "Written by Marta Vidal · Postpartum support series",
    bylineEs: "Escrito por Marta Vidal · Serie de apoyo posparto",
    reviewedNoteEn: "Reviewed by The Mothers Editorial",
    reviewedNoteEs: "Revisado por la redacción de The Mothers",
    audience: "public",
  },
  friends: {
    id: "friends",
    slug: "friends",
    cat: "friendship",
    dateEn: "Jul 28, 2026",
    dateEs: "28 jul 2026",
    readEn: "5 min read",
    readEs: "5 min de lectura",
    author: "The Mothers",
    roleEn: "",
    roleEs: "",
    heroImageUrl: "/assets/journal-friends.jpg",
    heroImageAlt: "Two mothers with strollers talking on a park path, seen from behind",
    titleEn: "Making mum friends in a city that isn't yours",
    titleEs: "Hacer amigas madres en una ciudad que no es la tuya",
    dekEn: "Why it is harder than anyone admits, and the three things that actually move a friendly acquaintance into a friend.",
    dekEs: "Por qué es más difícil de lo que se admite y las tres cosas que realmente convierten a una conocida en una amiga.",
    quoteEn: "The third time you see someone is when the conversation stops being about the babies.",
    quoteEs: "La tercera vez que ves a alguien es cuando la conversación deja de girar en torno a los bebés.",
    bodyEn: [
      "Moving to Barcelona with a baby, or having one shortly after arriving, produces a specific kind of loneliness. You are surrounded by people all day and speaking to almost none of them. The friendships you had at home ran on years of accumulated context; here you are starting from a shared bench in a playground.",
      "The first thing worth knowing is that proximity is not friendship, and most advice confuses the two. Joining a class puts you in a room with other mothers. It does not, on its own, produce anyone who will answer the phone at eleven at night.",
      "What does move things along is repetition. The same faces, at the same time, every week. Almost every real friendship formed in early motherhood comes from a recurring fixture rather than a one-off event, because the third conversation is where people stop performing.",
      "The second is asymmetry of effort. Somebody has to be the one who suggests the coffee, and in a group of tired strangers everyone is waiting for someone else to do it. Being that person feels exposing and works nearly every time.",
    ],
    bodyEs: [
      "Mudarse a Barcelona con un bebé, o tenerlo poco después de llegar, produce un tipo específico de soledad. Estás rodeada de gente todo el día y no hablas con casi nadie. Las amistades que tenías en casa funcionaban con años de contexto acumulado; aquí empiezas desde un banco compartido en un parque.",
      "Lo primero que conviene saber es que la proximidad no es amistad, y la mayoría de los consejos confunden ambas cosas. Apuntarse a una clase te mete en una sala con otras madres. No produce, por sí solo, a nadie que te coja el teléfono a las once de la noche.",
      "Lo que sí hace avanzar las cosas es la repetición. Las mismas caras, a la misma hora, todas las semanas. Casi todas las amistades reales en la maternidad temprana surgen de un encuentro recurrente más que de un evento único, porque en la tercera conversación es donde la gente deja de actuar.",
      "Lo segundo es la asimetría del esfuerzo. Alguien tiene que ser quien proponga el café, y en un grupo de desconocidas cansadas todas esperan a que lo haga otra. Ser esa persona da pudor, pero funciona casi siempre.",
    ],
    bodyAfterEn: [
      "The third is honesty, earlier than feels comfortable. The mothers who find their people quickly are usually the ones who answer 'how are you?' truthfully in week two rather than in month six. It filters fast, in both directions, and what remains is real.",
      "Language matters less than people fear. Barcelona motherhood runs in Spanish, Catalan, English and a good deal of gesture, and nobody has ever been excluded from a park bench for imperfect grammar.",
    ],
    bodyAfterEs: [
      "Lo tercero es la honestidad, antes de lo que resulta cómodo. Las madres que encuentran a su gente rápido suelen ser las que responden a '¿cómo estás?' con la verdad en la segunda semana en lugar de en el sexto mes. Filtra rápido, en ambas direcciones, y lo que queda es real.",
      "El idioma importa menos de lo que la gente teme. La maternidad en Barcelona funciona en castellano, catalán, inglés y muchos gestos, y a nadie se le ha excluido nunca de un banco del parque por una gramática imperfecta.",
    ],
    bylineEn: "Written by The Mothers Editorial",
    bylineEs: "Escrito por la redacción de The Mothers",
    reviewedNoteEn: "Reviewed by The Mothers",
    reviewedNoteEs: "Revisado por The Mothers",
    audience: "public",
  },
};

export default function JournalSlugPage() {
  const params = useParams();
  const rawSlug = Array.isArray(params.slug) ? params.slug.join("/") : params.slug || "";
  const cleanSlug = rawSlug.toLowerCase().replace(/^\/journal\//, "").replace(/\/$/, "");

  const [lang, setLang] = useState<Locale>("en");
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);

      // Track view asynchronously
      if (cleanSlug) {
        incrementJournalPostViews(cleanSlug);
      }

      // Check DB first
      const res = await getPublicJournalArticle(cleanSlug);
      if (res && res.post) {
        const p = res.post;
        const paragraphsEn = (p.body || "").split("\n\n").map((s: string) => s.trim()).filter(Boolean);
        const paragraphsEs = (p.bodyEs || p.body || "").split("\n\n").map((s: string) => s.trim()).filter(Boolean);

        // Split body before/after quote if quote exists
        const halfEn = Math.ceil(paragraphsEn.length / 2);
        const halfEs = Math.ceil(paragraphsEs.length / 2);

        const wordCountEn = (p.body || "").split(/\s+/).filter(Boolean).length;
        const readTime = Math.max(1, Math.round(wordCountEn / 200));

        const pubDate = p.publishedAt ? new Date(p.publishedAt) : new Date(p.createdAt);

        setArticle({
          id: p.id,
          slug: p.slug,
          cat: p.category,
          dateEn: pubDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          dateEs: pubDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
          readEn: `${readTime} min read`,
          readEs: `${readTime} min de lectura`,
          author: p.author || "The Mothers",
          roleEn: p.authorRoleEn || "",
          roleEs: p.authorRoleEs || "",
          heroImageUrl: p.heroImageUrl || "/assets/journal-doula.jpg",
          heroImageAlt: p.heroImageAlt || p.title,
          titleEn: p.title,
          titleEs: p.titleEs || p.title,
          dekEn: p.excerpt,
          dekEs: p.excerptEs || p.excerpt,
          quoteEn: p.quoteEn || "",
          quoteEs: p.quoteEs || "",
          bodyEn: p.quoteEn ? paragraphsEn.slice(0, halfEn) : paragraphsEn,
          bodyAfterEn: p.quoteEn ? paragraphsEn.slice(halfEn) : [],
          bodyEs: p.quoteEs ? paragraphsEs.slice(0, halfEs) : paragraphsEs,
          bodyAfterEs: p.quoteEs ? paragraphsEs.slice(halfEs) : [],
          bylineEn: p.bylineEn || `Written by ${p.author}`,
          bylineEs: p.bylineEs || `Escrito por ${p.author}`,
          reviewedNoteEn: p.reviewedNoteEn || "General information, not medical or legal advice.",
          reviewedNoteEs: p.reviewedNoteEs || "Información general, no consejo médico ni legal.",
          audience: p.audience || "public",
        });

        if (res.related) {
          setRelated(res.related);
        }
      } else if (STATIC_SEEDS[cleanSlug]) {
        // Fallback to static seed
        setArticle(STATIC_SEEDS[cleanSlug]);
      } else {
        setArticle(null);
      }
      setLoading(false);
    }

    if (cleanSlug) {
      loadArticle();
    }
  }, [cleanSlug]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8efe2",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
        }}
      >
        Loading article...
      </div>
    );
  }

  if (!article) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "80px 24px",
          textAlign: "center",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
        }}
      >
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", marginBottom: "16px" }}>
          {lang === "en" ? "Article not found" : "Artículo no encontrado"}
        </h1>
        <p style={{ color: "rgba(57,41,42,0.7)", marginBottom: "28px" }}>
          {lang === "en"
            ? "The article you are looking for does not exist or has been removed."
            : "El artículo que buscas no existe o ha sido retirado."}
        </p>
        <Link
          href="/journal"
          style={{
            border: "1px solid #7b1f2c",
            backgroundColor: "#7b1f2c",
            color: "#f8efe2",
            padding: "10px 20px",
            borderRadius: "4px",
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {lang === "en" ? "← Return to Journal" : "← Volver al Diario"}
        </Link>
      </div>
    );
  }

  const title = lang === "en" ? article.titleEn : article.titleEs;
  const dek = lang === "en" ? article.dekEn : article.dekEs;
  const quote = lang === "en" ? article.quoteEn : article.quoteEs;
  const bodyParas = lang === "en" ? article.bodyEn : article.bodyEs;
  const bodyAfterParas = lang === "en" ? article.bodyAfterEn : article.bodyAfterEs;
  const byline = lang === "en" ? article.bylineEn : article.bylineEs;
  const reviewedNote = lang === "en" ? article.reviewedNoteEn : article.reviewedNoteEs;
  const readTime = lang === "en" ? article.readEn : article.readEs;
  const dateStr = lang === "en" ? article.dateEn : article.dateEs;

  return (
    <div
      style={{
        backgroundColor: "#f8efe2",
        color: "#39292a",
        fontFamily: "'Lora', Georgia, serif",
        minHeight: "100vh",
      }}
    >
      <article
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px) clamp(48px, 6vw, 72px)",
        }}
      >
        {/* Back Link */}
        <Link
          href="/journal"
          style={{
            color: "rgba(57, 41, 42, 0.6)",
            fontSize: "13.5px",
            paddingBottom: "26px",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            textDecoration: "none",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="14"
            height="14"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          {lang === "en" ? "Back to the Journal" : "Volver al Diario"}
        </Link>

        {/* Category & Meta */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              border: "1px solid rgba(123, 31, 44, 0.35)",
              borderRadius: "12px",
              padding: "4px 11px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
            }}
          >
            {getCategoryLabel(article.cat, lang)}
          </span>
          <span style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)" }}>
            {readTime} · {dateStr}
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: "clamp(34px, 4.6vw, 54px)",
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            margin: "0 0 18px",
            textWrap: "pretty",
          }}
        >
          {title}
        </h1>

        {/* Standfirst / Dek */}
        <p
          style={{
            fontSize: "19px",
            lineHeight: 1.65,
            color: "rgba(57, 41, 42, 0.72)",
            margin: "0 0 30px",
            fontStyle: "italic",
            textWrap: "pretty",
          }}
        >
          {dek}
        </p>

        {/* Hero Cover Image */}
        {article.heroImageUrl && (
          <div
            style={{
              width: "100%",
              height: "clamp(240px, 32vw, 400px)",
              borderRadius: "6px",
              overflow: "hidden",
              marginBottom: "34px",
              backgroundColor: "rgba(57, 41, 42, 0.08)",
            }}
          >
            <img
              src={article.heroImageUrl}
              alt={article.heroImageAlt || title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        {/* Main Body Paragraphs */}
        {bodyParas.map((para, i) => (
          <p
            key={i}
            style={{
              fontSize: "17px",
              lineHeight: 1.8,
              color: "#39292a",
              margin: "0 0 22px",
              textWrap: "pretty",
            }}
          >
            {para}
          </p>
        ))}

        {/* Pull Quote */}
        {quote && (
          <blockquote
            style={{
              borderLeft: "2px solid #7b1f2c",
              margin: "34px 0",
              padding: "4px 0 4px 24px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: 1.35,
              color: "#7b1f2c",
              textWrap: "pretty",
            }}
          >
            {quote}
          </blockquote>
        )}

        {/* Secondary Body Paragraphs */}
        {bodyAfterParas.map((para, i) => (
          <p
            key={`after-${i}`}
            style={{
              fontSize: "17px",
              lineHeight: 1.8,
              color: "#39292a",
              margin: "0 0 22px",
              textWrap: "pretty",
            }}
          >
            {para}
          </p>
        ))}

        {/* Byline & Reviewed Footnote */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(57, 41, 42, 0.16)",
            marginTop: "34px",
            paddingTop: "20px",
          }}
        >
          <div style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.7)" }}>{byline}</div>
          <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)" }}>{reviewedNote}</div>
        </div>

        {/* Membership CTA Box */}
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.2)",
            backgroundColor: "#f8efe2",
            borderRadius: "6px",
            padding: "clamp(22px, 3vw, 32px)",
            marginTop: "36px",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "12.5px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "10px",
            }}
          >
            The Mothers
          </div>
          <h3
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: 1.2,
              margin: "0 0 10px",
            }}
          >
            {lang === "en"
              ? "The writing is free. The room is the membership."
              : "Los textos son gratis. La sala es la membresía."}
          </h3>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.65,
              color: "rgba(57, 41, 42, 0.72)",
              margin: "0 0 20px",
              maxWidth: "36em",
            }}
          >
            {lang === "en"
              ? "Walks, play dates, dinners and expert sessions across Barcelona — with the mothers you keep seeing until they become friends."
              : "Paseos, play dates, cenas y sesiones con expertas por toda Barcelona — con las madres a las que sigues viendo hasta que se convierten en amigas."}
          </p>
          <Link
            href="/membership"
            style={{
              display: "inline-block",
              border: "1px solid #7b1f2c",
              backgroundColor: "#7b1f2c",
              color: "#f8efe2",
              padding: "12px 24px",
              borderRadius: "4px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            {lang === "en" ? "See the membership" : "Ver la membresía"}
          </Link>
        </div>

        {/* More from Journal */}
        {related && related.length > 0 && (
          <div style={{ marginTop: "48px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "12.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57, 41, 42, 0.5)",
                marginBottom: "18px",
              }}
            >
              {lang === "en" ? "More from the Journal" : "Más del Diario"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "24px",
              }}
            >
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/journal/${r.slug}`}
                  style={{
                    textAlign: "left",
                    border: "1px solid rgba(57, 41, 42, 0.18)",
                    backgroundColor: "transparent",
                    borderRadius: "6px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#7b1f2c",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                    }}
                  >
                    {getCategoryLabel(r.category, lang)}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "19px",
                      lineHeight: 1.25,
                      color: "#39292a",
                    }}
                  >
                    {lang === "en" ? r.title : r.titleEs || r.title}
                  </span>
                  <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.6)" }}>
                    {lang === "en" ? r.excerpt : r.excerptEs || r.excerpt}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
