"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { tStr } from "@/lib/i18nEngine";
import { submitFirstVisitProfile, validateGodmotherCode } from "@/app/actions/memberAccount";

interface QuestionDef {
  key: string;
  kind: "multi" | "one" | "handle" | "text";
  req: boolean;
  referral?: boolean;
  titleEn: string;
  titleEs: string;
  helpEn: string;
  helpEs: string;
  optionsEn?: string[];
  optionsEs?: string[];
}

const QUESTIONS: QuestionDef[] = [
  {
    key: "stages",
    kind: "multi",
    req: true,
    titleEn: "Which stage are you in right now?",
    titleEs: "¿En qué etapa te encuentras ahora mismo?",
    helpEn: "Pick every one that applies — plenty of mothers sit in two.",
    helpEs: "Elige todas las que apliquen — muchas madres están en dos.",
    optionsEn: ["Pregnant", "Babies", "Toddlers", "Children", "Big kids"],
    optionsEs: ["Embarazada", "Bebés", "Primeros pasos", "Infantil", "Mayores"],
  },
  {
    key: "neighbourhood",
    kind: "one",
    req: true,
    titleEn: "Which neighbourhood are you in?",
    titleEs: "¿En qué barrio estás?",
    helpEn: "So we can host events close to you.",
    helpEs: "Para que podamos organizar eventos cerca de ti.",
    optionsEn: [
      "Ciutat Vella",
      "Eixample",
      "Sants-Montjuïc",
      "Les Corts",
      "Sarrià-Sant Gervasi",
      "Gràcia",
      "Horta-Guinardó",
      "Nou Barris",
      "Sant Andreu",
      "Sant Martí",
      "Outside Barcelona",
      "Not sure yet",
    ],
    optionsEs: [
      "Ciutat Vella",
      "Eixample",
      "Sants-Montjuïc",
      "Les Corts",
      "Sarrià-Sant Gervasi",
      "Gràcia",
      "Horta-Guinardó",
      "Nou Barris",
      "Sant Andreu",
      "Sant Martí",
      "Fuera de Barcelona",
      "Aún no lo sé",
    ],
  },
  {
    key: "hoping",
    kind: "multi",
    req: true,
    titleEn: "What are you hoping to find?",
    titleEs: "¿Qué esperas encontrar aquí?",
    helpEn: "Choose all that resonate — it helps us understand what matters to you.",
    helpEs: "Elige todo lo que resuene contigo — nos ayuda a entender qué te importa.",
    optionsEn: [
      "Friendships nearby",
      "Events",
      "Emotional support",
      "Expert recommendations",
      "Walks & socials",
    ],
    optionsEs: [
      "Amistades cercanas",
      "Eventos",
      "Apoyo emocional",
      "Recomendaciones de expertos",
      "Paseos y encuentros",
    ],
  },
  {
    key: "free",
    kind: "multi",
    req: true,
    titleEn: "When are you usually free?",
    titleEs: "¿Cuándo sueles tener tiempo libre?",
    helpEn: "We'll use this to schedule walks and socials you can actually make.",
    helpEs: "Usaremos esto para planificar encuentros a los que realmente puedas venir.",
    optionsEn: [
      "Weekday mornings",
      "Weekday afternoons",
      "Evenings",
      "Weekends",
    ],
    optionsEs: [
      "Mañanas entre semana",
      "Tardes entre semana",
      "Noches",
      "Fines de semana",
    ],
  },
  {
    key: "heard",
    kind: "one",
    req: true,
    referral: true,
    titleEn: "How did you hear about The Mothers?",
    titleEs: "¿Cómo nos has conocido?",
    helpEn: "If a Godmother sent you, add her code so she gets credited.",
    helpEs: "Si te invitó una Madrina, añade su código para asignarle el crédito.",
    optionsEn: [
      "Instagram",
      "A Mother referred me",
      "A friend or member",
      "Google search",
      "An event",
      "Other",
    ],
    optionsEs: [
      "Instagram",
      "Me refirió una Madre",
      "Una amiga o socia",
      "Búsqueda en Google",
      "Un evento",
      "Otro",
    ],
  },
  {
    key: "social",
    kind: "handle",
    req: false,
    titleEn: "What's your social media handle?",
    titleEs: "¿Cuál es tu usuario en redes sociales?",
    helpEn: "Totally optional — it just helps us get to know you a little better.",
    helpEs: "Totalmente opcional — nos ayuda a conocerte un poquito mejor.",
    optionsEn: ["Instagram", "TikTok", "Facebook", "Other"],
    optionsEs: ["Instagram", "TikTok", "Facebook", "Otro"],
  },
  {
    key: "why",
    kind: "text",
    req: false,
    titleEn: "What made you look for this?",
    titleEs: "¿Qué te hizo buscarnos?",
    helpEn:
      "A couple of sentences is plenty. It's so whoever welcomes you at your next event can greet you like someone she was expecting.",
    helpEs:
      "Un par de frases es más que suficiente. Es para que quien te reciba en tu próximo evento sepa esperarte.",
  },
];

function FirstVisitProfileModalContent() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const { language: lang } = useLanguage();
  const isEn = lang === "en";
  

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Godmother live validation state
  const [godmotherStatus, setGodmotherStatus] = useState<{
    checking?: boolean;
    valid?: boolean;
    name?: string;
    error?: string;
  }>({});

  // Check if modal should open
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkOpenCondition = () => {
      if (!session?.user) {
        setIsOpen(false);
        return;
      }

      const user = session.user as any;
      const role = user?.role;
      const isAdmin =
        role === "owner" ||
        role === "manager" ||
        role === "host" ||
        role === "super_admin";

      if (isAdmin) {
        setIsOpen(false);
        return;
      }

      const path = window.location.pathname;
      const isAuthPage =
        path.includes("/account/login") ||
        path.includes("/account/signup") ||
        path.includes("/account/forgot-password") ||
        path.includes("/account/reset-password") ||
        path.includes("/admin");

      const profileDone = user?.profileDone === true;
      const localDone = localStorage.getItem("tm_profile_done") === "true";

      if (!profileDone && !localDone && !isAuthPage) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkOpenCondition();
  }, [session, pathname]);

  const currentQ = QUESTIONS[step];
  if (!isOpen || !currentQ) return null;

  const totalSteps = QUESTIONS.length;
  const progressPct = Math.round(((step + 1) / totalSteps) * 100);

  const userName =
    (session?.user as any)?.firstName ||
    session?.user?.name?.split(" ")[0] ||
    (isEn ? "mother" : "madre");

  const val = answers[currentQ.key];
  const options = isEn ? currentQ.optionsEn || [] : currentQ.optionsEs || [];

  const handleChipClick = (optionEn: string, optionEs: string) => {
    setErrorMsg("");
    const storedVal = optionEn; // Store in standard English format internally

    if (currentQ.kind === "multi") {
      const currentList: string[] = Array.isArray(val) ? val : [];
      if (currentList.includes(storedVal)) {
        setAnswers((prev) => ({
          ...prev,
          [currentQ.key]: currentList.filter((x) => x !== storedVal),
        }));
      } else {
        setAnswers((prev) => ({
          ...prev,
          [currentQ.key]: [...currentList, storedVal],
        }));
      }
    } else {
      setAnswers((prev) => ({
        ...prev,
        [currentQ.key]: storedVal,
      }));
    }
  };

  const handleGodmotherCodeChange = async (code: string) => {
    setErrorMsg("");
    setAnswers((prev) => ({ ...prev, godmotherCode: code }));

    const clean = code.trim();
    if (!clean || clean.length < 3) {
      setGodmotherStatus({});
      return;
    }

    setGodmotherStatus({ checking: true });
    try {
      const res = await validateGodmotherCode(clean);
      if (res.valid) {
        setGodmotherStatus({ valid: true, name: res.godmotherName });
      } else {
        setGodmotherStatus({ valid: false, error: res.error });
      }
    } catch {
      setGodmotherStatus({ valid: false, error: "Validation failed" });
    }
  };

  const handleNext = async (skip = false) => {
    if (!skip && currentQ.req) {
      const empty =
        val == null ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === "string" && val.trim() === "");

      if (empty) {
        setErrorMsg(
          currentQ.kind === "one"
            ? isEn
              ? "Please choose an answer to continue."
              : "Por favor, elige una respuesta para continuar."
            : isEn
            ? "Please choose at least one answer to continue."
            : "Por favor, elige al menos una respuesta para continuar."
        );
        return;
      }
    }

    if (step < totalSteps - 1) {
      setErrorMsg("");
      setStep(step + 1);
    } else {
      // Final submit
      setLoading(true);
      setErrorMsg("");
      try {
        const finalStages = Array.isArray(answers.stages) ? answers.stages : [];
        const finalHoping = Array.isArray(answers.hoping) ? answers.hoping : [];
        const finalAvailability = Array.isArray(answers.free) ? answers.free : [];
        const finalNeighbourhood = answers.neighbourhood || "Barcelona";
        const finalHeard = answers.heard || "Other";
        const finalGodmotherCode =
          answers.godmotherCode && answers.godmotherCode.trim()
            ? answers.godmotherCode.trim()
            : undefined;

        let finalSocial: string | undefined = undefined;
        if (answers.socialHandle && answers.socialHandle.trim()) {
          finalSocial = `${answers.socialPlatform || "Instagram"}: ${answers.socialHandle.trim()}`;
        }

        const finalWhy = answers.why && answers.why.trim() ? answers.why.trim() : undefined;

        const res = await submitFirstVisitProfile({
          stages: finalStages,
          neighbourhood: finalNeighbourhood,
          hoping: finalHoping,
          availability: finalAvailability,
          heard: finalHeard,
          godmotherCode: finalGodmotherCode,
          social: finalSocial,
          why: finalWhy,
        });

        if (res.success) {
          if (update) {
            await update({ profileDone: true });
          }
          localStorage.setItem("tm_profile_done", "true");
          setIsOpen(false);
        } else {
          setErrorMsg(res.error || (isEn ? "Could not save profile." : "No se pudo guardar el perfil."));
        }
      } catch (err: any) {
        setErrorMsg(err?.message || (isEn ? "Failed to save profile." : "Error al guardar el perfil."));
      } finally {
        setLoading(false);
      }
    }
  };

  const isLast = step === totalSteps - 1;
  const isReferralSelected =
    currentQ.referral &&
    (val === "A Mother referred me" || val === "Me refirió una Madre");

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(57, 41, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          backgroundColor: "#f8efe2",
          borderRadius: "12px",
          boxShadow: "0 18px 50px rgba(57, 41, 42, 0.28)",
          padding: "clamp(24px, 5vw, 44px)",
          boxSizing: "border-box",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar: Kicker & Question N of 7 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7b1f2c",
            }}
          >
            {isEn ? `WELCOME, ${userName}` : `BIENVENIDA, ${userName}`}
          </span>
          <span
            style={{
              fontSize: "13px",
              color: "rgba(57, 41, 42, 0.66)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {isEn ? `Question ${step + 1} of ${totalSteps}` : `Pregunta ${step + 1} de ${totalSteps}`}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "3px",
            backgroundColor: "rgba(57, 41, 42, 0.12)",
            borderRadius: "2px",
            marginBottom: "clamp(22px, 4vw, 32px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: "#7b1f2c",
              width: `${progressPct}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Question Title */}
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(26px, 4vw, 32px)",
            lineHeight: 1.15,
            margin: "0 0 10px",
            color: "#39292a",
          }}
        >
          {isEn ? currentQ.titleEn : currentQ.titleEs}
          {currentQ.req && <span style={{ color: "#7b1f2c" }}> *</span>}
        </h2>

        {/* Question Help Text */}
        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.6,
            color: "rgba(57, 41, 42, 0.74)",
            margin: "0 0 22px",
          }}
        >
          {isEn ? currentQ.helpEn : currentQ.helpEs}
        </p>

        {/* Chips for Multi / One */}
        {(currentQ.kind === "multi" || currentQ.kind === "one") && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "9px" }}>
            {(currentQ.optionsEn || []).map((optEn, idx) => {
              const optEs = (currentQ.optionsEs || [])[idx] || optEn;
              const isSelected =
                currentQ.kind === "multi"
                  ? Array.isArray(val) && val.includes(optEn)
                  : val === optEn;

              return (
                <button
                  key={optEn}
                  type="button"
                  onClick={() => handleChipClick(optEn, optEs)}
                  style={{
                    border: isSelected
                      ? "1px solid #7b1f2c"
                      : "1px solid rgba(57, 41, 42, 0.24)",
                    backgroundColor: isSelected
                      ? "rgba(123, 31, 44, 0.08)"
                      : "#ffffff",
                    color: isSelected ? "#7b1f2c" : "#39292a",
                    borderRadius: "20px",
                    padding: "9px 16px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isEn ? optEn : optEs}
                </button>
              );
            })}
          </div>
        )}

        {/* Godmother code input if "A Mother referred me" is selected */}
        {isReferralSelected && (
          <div style={{ marginTop: "16px" }}>
            <input
              type="text"
              value={answers.godmotherCode || ""}
              onChange={(e) => handleGodmotherCodeChange(e.target.value)}
              placeholder="Godmother code (e.g. MOTHERS-CLARA-BCN)"
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                padding: "13px 15px",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "15px",
                color: "#39292a",
                textTransform: "uppercase",
                outline: "none",
              }}
            />
            <div
              style={{
                fontSize: "12.5px",
                marginTop: "6px",
                color: godmotherStatus.valid
                  ? "#3b5e04"
                  : godmotherStatus.error
                  ? "#993842"
                  : "rgba(57, 41, 42, 0.66)",
              }}
            >
              {godmotherStatus.checking
                ? isEn
                  ? "Checking code…"
                  : "Verificando código…"
                : godmotherStatus.valid
                ? `✓ Code from ${godmotherStatus.name} — it credits her account.`
                : godmotherStatus.error
                ? isEn
                  ? "We can't find this code. Check it with the mother who gave it to you."
                  : "No encontramos este código. Compruébalo con la madre que te lo dio."
                : isEn
                ? "This code credits your Godmother's account."
                : "Este código abona créditos en la cuenta de tu Madrina."}
            </div>
          </div>
        )}

        {/* Social Handle question */}
        {currentQ.kind === "handle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "9px" }}>
              {(currentQ.optionsEn || []).map((platform) => {
                const isSelected =
                  (answers.socialPlatform || "Instagram") === platform;
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => {
                      setAnswers((prev) => ({
                        ...prev,
                        socialPlatform: platform,
                      }));
                    }}
                    style={{
                      border: isSelected
                        ? "1px solid #7b1f2c"
                        : "1px solid rgba(57, 41, 42, 0.24)",
                      backgroundColor: isSelected
                        ? "rgba(123, 31, 44, 0.08)"
                        : "#ffffff",
                      color: isSelected ? "#7b1f2c" : "#39292a",
                      borderRadius: "20px",
                      padding: "9px 16px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={answers.socialHandle || ""}
              onChange={(e) => {
                const h = e.target.value;
                setAnswers((prev) => ({ ...prev, socialHandle: h }));
              }}
              placeholder="@yourhandle"
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                padding: "13px 15px",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "15px",
                color: "#39292a",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Text why question */}
        {currentQ.kind === "text" && (
          <textarea
            value={answers.why || ""}
            onChange={(e) => {
              const w = e.target.value;
              setAnswers((prev) => ({ ...prev, why: w }));
            }}
            rows={4}
            placeholder={
              isEn
                ? "A couple of sentences is plenty."
                : "Un par de frases es más que suficiente."
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid rgba(57, 41, 42, 0.24)",
              borderRadius: "4px",
              backgroundColor: "#ffffff",
              padding: "13px 15px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "15px",
              lineHeight: 1.55,
              color: "#39292a",
              resize: "vertical",
              outline: "none",
            }}
          />
        )}

        {/* Error message */}
        {errorMsg && (
          <p
            style={{
              fontSize: "13.5px",
              color: "#993842",
              margin: "12px 0 0",
            }}
          >
            {errorMsg}
          </p>
        )}

        {/* Footer actions */}
        <div
          style={{
            borderTop: "1px solid rgba(57, 41, 42, 0.14)",
            marginTop: "26px",
            paddingTop: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setStep(step - 1);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "14px",
                  color: "rgba(57, 41, 42, 0.74)",
                  cursor: "pointer",
                }}
              >
                {isEn ? "← Back" : "← Atrás"}
              </button>
            )}
            {!currentQ.req && (
              <button
                type="button"
                onClick={() => handleNext(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "14px",
                  color: "rgba(57, 41, 42, 0.74)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {isEn ? "Skip" : "Saltar"}
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleNext(false)}
            style={{
              border: "1px solid #7b1f2c",
              backgroundColor: "transparent",
              color: "#7b1f2c",
              borderRadius: "4px",
              padding: "12px 30px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "16px",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.07)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            {loading
              ? isEn
                ? "Saving…"
                : "Guardando…"
              : isLast
              ? isEn
                ? "Finish"
                : "Terminar"
              : isEn
              ? "Continue"
              : "Continuar"}
          </button>
        </div>

        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.6,
            color: "rgba(57, 41, 42, 0.66)",
            textAlign: "center",
            margin: "22px 0 0",
          }}
        >
          {isEn
            ? "A few questions so we can plan events that suit you. Your answers stay private and are only used by our team."
            : "Unas breves preguntas para planificar eventos que se adapten a ti. Tus respuestas son privadas y solo las usa nuestro equipo."}
        </p>
      </div>
    </div>
  );
}

export function FirstVisitProfileModal() {
  return (
    <Suspense fallback={null}>
      <FirstVisitProfileModalContent />
    </Suspense>
  );
}
export default FirstVisitProfileModal;
