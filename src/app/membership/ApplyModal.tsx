"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { submitApplication, checkEmailExists, ApplicationFormData } from "@/app/actions/application";

const STORAGE_KEY = "tm_apply_form";

export function ApplyModal({
  isOpen,
  onClose,
  lang = "en",
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: "en" | "es";
}) {
  const [step, setStep] = useState<number>(0); // 0-indexed (0 to 10 = 11 steps)
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);
  const [existingMemberEmail, setExistingMemberEmail] = useState<boolean>(false);

  const [answers, setAnswers] = useState<ApplicationFormData & { referralCode?: string }>({
    firstName: "",
    lastName: "",
    email: "",
    stage: "Pregnant",
    childrenAge: "",
    neighbourhood: "Eixample",
    hopingToFind: ["Friendships nearby"],
    freeTimes: ["Weekday mornings"],
    referralSource: "Instagram",
    referralCode: "",
    socialPlatform: "Instagram",
    socialHandle: "",
    motivation: "",
    billingPreference: "monthly",
    termsAccepted: false,
    locale: lang,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setAnswers((prev) => ({ ...prev, ...parsed, termsAccepted: false }));
        if (parsed._step && typeof parsed._step === "number") {
          setStep(parsed._step);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...answers, _step: step }));
    } catch {
      // ignore
    }
  }, [answers, step]);

  if (!isOpen) return null;

  const totalSteps = 11;
  const progressPct = ((step + 1) / totalSteps) * 100;

  const stepsMeta = [
    {
      titleEn: "First — what should we call you?",
      subEn: "Your surname stays private; members only ever see your first name.",
      titleEs: "Primero — ¿cómo te llamamos?",
      subEs: "Tu apellido se mantiene privado; las socias solo ven tu nombre.",
    },
    {
      titleEn: "How can we reach you?",
      subEn: "Your email is all we need to review this and welcome you in. We'll ask for a phone number once you're a member — not before.",
      titleEs: "¿Cómo podemos contactarte?",
      subEs: "Con tu correo nos basta para revisar la solicitud y darte la bienvenida. El teléfono te lo pediremos cuando ya seas socia, no antes.",
    },
    {
      titleEn: "Which stage are you in right now?",
      subEn: "It helps us plan events for the stage you are actually in.",
      titleEs: "¿En qué etapa estás ahora mismo?",
      subEs: "Nos ayuda a programar encuentros para la etapa en la que estás.",
    },
    {
      titleEn: "What are your children's ages?",
      subEn: "So we can organize play dates by age group. If you're pregnant, just share your due date instead.",
      titleEs: "¿Qué edades tienen tus hijos/as?",
      subEs: "Así podemos organizar encuentros por grupo de edad. Si estás embarazada, comparte tu fecha prevista.",
    },
    {
      titleEn: "Which neighbourhood are you in?",
      subEn: "So we can host events close to you.",
      titleEs: "¿En qué barrio estás?",
      subEs: "Así organizamos encuentros cerca de ti.",
    },
    {
      titleEn: "What are you hoping to find?",
      subEn: "Choose all that resonate — it helps us understand what matters to you.",
      titleEs: "¿Qué esperas encontrar?",
      subEs: "Elige todas las que resuenen — nos ayuda a entender qué te importa.",
    },
    {
      titleEn: "When are you usually free?",
      subEn: "We'll use this to schedule walks and socials you can actually make.",
      titleEs: "¿Cuándo suele quedar libre tu agenda?",
      subEs: "Lo usaremos para programar paseos y encuentros que puedas hacer de verdad.",
    },
    {
      titleEn: "How did you hear about The Mothers?",
      subEn: "If a Godmother sent you, add her code so she gets credited.",
      titleEs: "¿Cómo conociste The Mothers?",
      subEs: "Si te envió una Madrina, añade su código para que reciba sus créditos.",
    },
    {
      titleEn: "What's your social media handle?",
      subEn: "Totally optional — it just helps us get to know you a little better before you join.",
      titleEs: "¿Cuál es tu usuario de redes sociales?",
      subEs: "Totalmente opcional — solo nos ayuda a conocerte un poco mejor antes de que te unas.",
    },
    {
      titleEn: "What made you look for this?",
      subEn: "A couple of sentences is plenty. This isn't screening — it's so whoever hosts your first walk can greet you like someone she was expecting.",
      titleEs: "¿Qué te hizo buscar esto?",
      subEs: "Con un par de frases es suficiente. No es un filtro: es para que quien reciba tu primer paseo te salude como a alguien a quien esperaba.",
    },
    {
      titleEn: "How would you like to be billed?",
      subEn: "Choose monthly or every 3 months — this is how we schedule your billing if accepted.",
      titleEs: "¿Cómo prefieres que te facturemos?",
      subEs: "Elige mensual o trimestral — así programamos tu facturación si eres aceptada.",
    },
  ];

  const currentMeta = stepsMeta[step];

  const handleNext = async () => {
    setShowError(false);
    setExistingMemberEmail(false);
    if (step === 0 && !answers.firstName.trim()) {
      setShowError(true);
      return;
    }
    if (step === 1) {
      if (!answers.email.trim() || !answers.email.includes("@")) {
        setShowError(true);
        return;
      }
      // Check if this email already has an account
      setLoading(true);
      const emailCheck = await checkEmailExists(answers.email.trim());
      setLoading(false);
      if (emailCheck.exists) {
        setExistingMemberEmail(true);
        return;
      }
    }
    if (step === 5 && answers.hopingToFind.length === 0) {
      setShowError(true);
      return;
    }
    if (step === 6 && answers.freeTimes.length === 0) {
      setShowError(true);
      return;
    }

    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setShowError(false);
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const toggleChip = (field: "hopingToFind" | "freeTimes", val: string) => {
    setAnswers((prev) => {
      const list = prev[field];
      if (list.includes(val)) {
        return { ...prev, [field]: list.filter((item) => item !== val) };
      } else {
        return { ...prev, [field]: [...list, val] };
      }
    });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!answers.termsAccepted) {
      setShowError(true);
      return;
    }

    setLoading(true);
    setShowError(false);
    setSubmitError(null);
    const res = await submitApplication(answers);
    setLoading(false);

    if (res.success) {
      localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
    } else if (res.error === "EXISTING_MEMBER") {
      setExistingMemberEmail(true);
      setStep(1); // go back to email step
    } else {
      setSubmitError(
        lang === "en"
          ? "We encountered a database connection issue. Please check your internet connection and try again."
          : "Hemos detectado un problema de conexión con la base de datos. Por favor, comprueba tu conexión a internet e inténtalo de nuevo."
      );
    }
  };

  const inputStyle: React.CSSProperties = {
    minHeight: "48px",
    padding: "12px 16px",
    fontSize: "15px",
    fontFamily: "var(--font-body)",
    color: "#39292a",
    backgroundColor: "#ffffff",
    border: "1px solid rgba(57,41,42,0.22)",
    borderRadius: "5px",
    boxSizing: "border-box",
    width: "100%",
    outline: "none",
  };

  // ─── CONFIRMATION MODAL ───
  if (submitted) {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(57,41,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 1000, overflowY: "auto" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: "480px", margin: "auto", border: "1px solid #7b1f2c", borderRadius: "10px", padding: "clamp(32px, 5vw, 48px)", textAlign: "center", backgroundColor: "#f8efe2", boxShadow: "0 18px 44px rgba(45,43,43,0.14)" }}>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", position: "absolute", top: "16px", right: "16px", width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(57,41,42,0.5)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <div style={{ color: "#568b05", marginBottom: "16px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="36" height="36" style={{ margin: "0 auto", display: "block" }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "28px", margin: "0 0 12px", color: "#39292a" }}>
            {lang === "en" ? "Application received." : "Solicitud recibida."}
          </h2>
          <p style={{ fontSize: "15.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.72)", margin: "0 0 24px" }}>
            {lang === "en"
              ? "We review every application individually. You'll get an email letting you know whether you've been accepted — if you have, it'll include a payment link, and your membership is only confirmed once that payment is completed."
              : "Revisamos cada solicitud de forma individual. Recibirás un correo indicándote si has sido aceptada — si lo eres, incluirá un enlace de pago, y tu membresía solo queda confirmada una vez completado dicho pago."}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #7b1f2c",
              color: "#7b1f2c",
              padding: "12px 28px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "15px",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {lang === "en" ? "Got it" : "Entendido"}
          </button>
        </div>
      </div>
    );
  }

  // ─── WIZARD MODAL ───
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(57,41,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 1000, overflowY: "auto" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "560px",
          margin: "auto",
          border: "1px solid rgba(57,41,42,0.18)",
          borderRadius: "10px",
          padding: "clamp(28px, 5vw, 44px)",
          backgroundColor: "#f8efe2",
          boxShadow: "0 18px 44px rgba(45,43,43,0.14)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(57,41,42,0.5)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", marginBottom: "6px" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c" }}>
            {lang === "en" ? "BECOME A MOM" : "BECOME A MOM"}
          </div>
          <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.55)", whiteSpace: "nowrap" }}>
            {lang === "en" ? `Question ${step + 1} of ${totalSteps}` : `Pregunta ${step + 1} de ${totalSteps}`}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: "3px", borderRadius: "2px", backgroundColor: "rgba(57,41,42,0.12)", overflow: "hidden", marginBottom: "32px" }}>
          <div style={{ height: "100%", backgroundColor: "#7b1f2c", borderRadius: "2px", width: `${progressPct}%`, transition: "width 0.25s" }} />
        </div>

        {/* Step Title & Sub */}
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(26px, 4vw, 32px)", lineHeight: 1.2, margin: "0 0 12px", color: "#39292a" }}>
          {lang === "en" ? currentMeta.titleEn : currentMeta.titleEs}
          {[0, 1, 2, 4, 5, 6, 10].includes(step) && <span style={{ color: "#7b1f2c", marginLeft: "4px" }}>*</span>}
        </h2>
        {currentMeta && (
          <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(57,41,42,0.68)", margin: "0 0 28px" }}>
            {lang === "en" ? currentMeta.subEn : currentMeta.subEs}
          </p>
        )}

        {/* Step 0: Names */}
        {step === 0 && (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
            <input
              type="text"
              value={answers.firstName}
              onChange={(e) => {
                setAnswers({ ...answers, firstName: e.target.value });
                if (showError) setShowError(false);
              }}
              placeholder={lang === "en" ? "First name *" : "Nombre *"}
              style={{ ...inputStyle, flex: "1 1 180px", border: showError && !answers.firstName.trim() ? "1px solid #993842" : inputStyle.border }}
              autoFocus
            />
            <input
              type="text"
              value={answers.lastName || ""}
              onChange={(e) => setAnswers({ ...answers, lastName: e.target.value })}
              placeholder={lang === "en" ? "Last name (optional)" : "Apellido (opcional)"}
              style={{ ...inputStyle, flex: "1 1 180px" }}
            />
          </div>
        )}
        {showError && step === 0 && !answers.firstName.trim() && (
          <p style={{ fontSize: "13px", color: "#993842", margin: "4px 0 0" }}>
            {lang === "en" ? "Please answer this question to continue." : "Por favor, responde a esta pregunta para continuar."}
          </p>
        )}

        {/* Step 1: Email */}
        {step === 1 && (
          <div style={{ marginBottom: "8px" }}>
            <input
              type="email"
              value={answers.email}
              onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
              placeholder="you@email.com"
              style={inputStyle}
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Stage */}
        {step === 2 && (
          <div style={{ marginBottom: "8px" }}>
            <select
              value={answers.stage}
              onChange={(e) => setAnswers({ ...answers, stage: e.target.value })}
              style={inputStyle}
            >
              <option value="Pregnant">{lang === "en" ? "Pregnant" : "Embarazo"}</option>
              <option value="Babies (0–12 months)">{lang === "en" ? "Babies (0–12 months)" : "Bebés (0–12 meses)"}</option>
              <option value="Toddlers (1–3 years)">{lang === "en" ? "Toddlers (1–3 years)" : "Peques (1–3 años)"}</option>
              <option value="Children (3–10 years)">{lang === "en" ? "Children (3–10 years)" : "Niños/as (3–10 años)"}</option>
              <option value="Big Kids (10+)">{lang === "en" ? "Big Kids (10+)" : "Mayores (10+)"}</option>
              <option value="More than one stage at once">{lang === "en" ? "More than one stage at once" : "Más de una etapa a la vez"}</option>
            </select>
          </div>
        )}

        {/* Step 3: Children's Ages */}
        {step === 3 && (
          <div style={{ marginBottom: "8px" }}>
            <select
              value={answers.childrenAge || ""}
              onChange={(e) => setAnswers({ ...answers, childrenAge: e.target.value })}
              style={inputStyle}
            >
              <option value="">{lang === "en" ? "Select one" : "Selecciona una opción"}</option>
              <option value="Pregnant">{lang === "en" ? "Pregnant" : "Embarazada"}</option>
              <option value="0–6 months">{lang === "en" ? "0–6 months" : "0–6 meses"}</option>
              <option value="6–12 months">{lang === "en" ? "6–12 months" : "6–12 meses"}</option>
              <option value="1–3 years">{lang === "en" ? "1–3 years" : "1–3 años"}</option>
              <option value="3–6 years">{lang === "en" ? "3–6 years" : "3–6 años"}</option>
              <option value="6–10 years">{lang === "en" ? "6–10 years" : "6–10 años"}</option>
              <option value="More than one age range">{lang === "en" ? "More than one age range" : "Más de un rango de edad"}</option>
            </select>
          </div>
        )}

        {/* Step 4: Neighbourhood */}
        {step === 4 && (
          <div style={{ marginBottom: "8px" }}>
            <select
              value={answers.neighbourhood}
              onChange={(e) => setAnswers({ ...answers, neighbourhood: e.target.value })}
              style={inputStyle}
            >
              {["Ciutat Vella", "Eixample", "Sants-Montjuïc", "Les Corts", "Sarrià-Sant Gervasi", "Gràcia", "Horta-Guinardó", "Nou Barris", "Sant Andreu", "Sant Martí"].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="Outside Barcelona">{lang === "en" ? "Outside Barcelona" : "Fuera de Barcelona"}</option>
              <option value="Not sure yet">{lang === "en" ? "Not sure yet" : "Aún no lo sé"}</option>
            </select>
          </div>
        )}

        {/* Step 5: Hoping to find (Chips) */}
        {step === 5 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
            {[
              { en: "Friendships nearby", es: "Amistades cercanas" },
              { en: "Activity partners", es: "Compañeras de actividades" },
              { en: "Emotional support", es: "Apoyo emocional" },
              { en: "Expert recommendations", es: "Recomendaciones de expertas" },
              { en: "Walks & socials", es: "Paseos y encuentros" },
            ].map((opt) => {
              const isSelected = answers.hopingToFind.includes(opt.en);
              return (
                <button
                  key={opt.en}
                  type="button"
                  onClick={() => toggleChip("hopingToFind", opt.en)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "20px",
                    border: isSelected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.25)",
                    backgroundColor: isSelected ? "#7b1f2c" : "rgba(57,41,42,0.04)",
                    color: isSelected ? "#f8efe2" : "#39292a",
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? opt.en : opt.es}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 6: Free times (Chips) */}
        {step === 6 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
            {[
              { en: "Weekday mornings", es: "Mañanas entre semana" },
              { en: "Weekday afternoons", es: "Tardes entre semana" },
              { en: "Evenings", es: "Noches" },
              { en: "Weekends", es: "Fines de semana" },
            ].map((opt) => {
              const isSelected = answers.freeTimes.includes(opt.en);
              return (
                <button
                  key={opt.en}
                  type="button"
                  onClick={() => toggleChip("freeTimes", opt.en)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "20px",
                    border: isSelected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.25)",
                    backgroundColor: isSelected ? "#7b1f2c" : "rgba(57,41,42,0.04)",
                    color: isSelected ? "#f8efe2" : "#39292a",
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? opt.en : opt.es}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 7: Referral source */}
        {step === 7 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "8px" }}>
            <select
              value={answers.referralSource || ""}
              onChange={(e) => setAnswers({ ...answers, referralSource: e.target.value })}
              style={inputStyle}
            >
              <option value="Instagram">Instagram</option>
              <option value="A Godmother referred me">{lang === "en" ? "A Godmother referred me" : "Me refirió una Madrina"}</option>
              <option value="A friend or member">{lang === "en" ? "A friend or member" : "Una amiga o socia"}</option>
              <option value="Google search">{lang === "en" ? "Google search" : "Búsqueda en Google"}</option>
              <option value="An event">{lang === "en" ? "An event" : "Un evento"}</option>
              <option value="Other">{lang === "en" ? "Other" : "Otro"}</option>
            </select>

            {answers.referralSource === "A Godmother referred me" && (
              <div>
                <input
                  type="text"
                  value={answers.referralCode || ""}
                  onChange={(e) => setAnswers({ ...answers, referralCode: e.target.value })}
                  placeholder={lang === "en" ? "Her referral code — e.g. ANDREA-M4F2" : "Su código de referido — p. ej. ANDREA-M4F2"}
                  style={{ ...inputStyle, letterSpacing: "0.04em" }}
                />
                <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)", marginTop: "8px" }}>
                  {lang === "en" ? "Optional. Her code credits her account when you join." : "Opcional. Su código acredita su cuenta cuando te unes."}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 8: Social media */}
        {step === 8 && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
            <select
              value={answers.socialPlatform}
              onChange={(e) => setAnswers({ ...answers, socialPlatform: e.target.value })}
              style={{ ...inputStyle, flex: "1 1 140px" }}
            >
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="Facebook">Facebook</option>
              <option value="Other">{lang === "en" ? "Other" : "Otra"}</option>
            </select>
            <input
              type="text"
              value={answers.socialHandle || ""}
              onChange={(e) => setAnswers({ ...answers, socialHandle: e.target.value })}
              placeholder={lang === "en" ? "@yourhandle (optional)" : "@tuusuario (opcional)"}
              style={{ ...inputStyle, flex: "1 1 200px" }}
            />
          </div>
        )}

        {/* Step 9: Motivation */}
        {step === 9 && (
          <div style={{ marginBottom: "8px" }}>
            <textarea
              value={answers.motivation || ""}
              onChange={(e) => setAnswers({ ...answers, motivation: e.target.value })}
              placeholder={lang === "en" ? "A couple of sentences is plenty..." : "Un par de frases es más que suficiente..."}
              style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
            />
          </div>
        )}

        {/* Step 10: Billing & Consent */}
        {step === 10 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "8px" }}>
            <select
              value={answers.billingPreference}
              onChange={(e) => setAnswers({ ...answers, billingPreference: e.target.value })}
              style={inputStyle}
            >
              <option value="monthly">
                {lang === "en"
                  ? "Monthly — €29/month, Opening Circle rate"
                  : "Mensual — 29€/mes, tarifa Opening Circle"}
              </option>
              <option value="quarterly">
                {lang === "en"
                  ? "Every 3 months — €79 every 3 months, Opening Circle rate"
                  : "Cada 3 meses — 79€ cada 3 meses, tarifa Opening Circle"}
              </option>
            </select>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "14px", color: "rgba(57,41,42,0.85)" }}>
              <input
                type="checkbox"
                checked={answers.termsAccepted}
                onChange={(e) => setAnswers({ ...answers, termsAccepted: e.target.checked })}
                style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "#7b1f2c", cursor: "pointer", flex: "none" }}
              />
              <span>
                {lang === "en" ? (
                  <>
                    I agree to the <Link href="/terms" target="_blank" style={{ color: "#7b1f2c" }}>Terms & Conditions</Link> and{" "}
                    <Link href="/privacy" target="_blank" style={{ color: "#7b1f2c" }}>Privacy Policy</Link>.
                  </>
                ) : (
                  <>
                    Acepto los <Link href="/terms" target="_blank" style={{ color: "#7b1f2c" }}>Términos y Condiciones</Link> y la{" "}
                    <Link href="/privacy" target="_blank" style={{ color: "#7b1f2c" }}>Política de Privacidad</Link>.
                  </>
                )}
              </span>
            </label>
          </div>
        )}

        {/* Error messages */}
        {existingMemberEmail && (
          <p style={{ fontSize: "13.5px", color: "#993842", margin: "10px 0 0", lineHeight: 1.5 }}>
            {lang === "en" ? (
              <>
                You already have an account with us.{" "}
                <Link href="/account/login" style={{ color: "#7b1f2c", fontWeight: 600, textDecoration: "underline" }}>
                  Log in
                </Link>
                {" "}
                to access your account or book events.
              </>
            ) : (
              <>
                Ya tienes una cuenta con nosotras.{" "}
                <Link href="/account/login" style={{ color: "#7b1f2c", fontWeight: 600, textDecoration: "underline" }}>
                  Inicia sesión
                </Link>
                {" "}
                para acceder a tu cuenta o reservar eventos.
              </>
            )}
          </p>
        )}
        {showError && !existingMemberEmail && (
          <p style={{ fontSize: "13px", color: "#993842", margin: "10px 0 0" }}>
            {lang === "en" ? "Please answer this question to continue." : "Responde esta pregunta para continuar."}
          </p>
        )}
        {submitError && (
          <p style={{ fontSize: "13.5px", color: "#993842", margin: "10px 0 0", fontWeight: 500, lineHeight: 1.5 }}>
            {submitError}
          </p>
        )}

        {/* Bottom bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(57,41,42,0.14)" }}>
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(57,41,42,0.6)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                cursor: "pointer",
                padding: "8px 4px",
              }}
            >
              {lang === "en" ? "← Back" : "← Atrás"}
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            style={{
              border: "1px solid #7b1f2c",
              color: "#7b1f2c",
              background: "transparent",
              padding: "12px 28px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "15px",
              cursor: loading ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading
              ? lang === "en"
                ? "Submitting..."
                : "Enviando..."
              : step === totalSteps - 1
              ? lang === "en"
                ? "Submit application"
                : "Enviar solicitud"
              : lang === "en"
              ? "Continue"
              : "Continuar"}
          </button>
        </div>

        {/* Privacy Note */}
        <p style={{ fontSize: "12.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.5)", margin: "22px 0 0", textAlign: "center" }}>
          {lang === "en"
            ? "Applications are reviewed individually — a short, light-touch step that keeps this space feeling safe. Your information is kept private and used only to review your application."
            : "Las solicitudes se revisan de forma individual — un paso breve y cuidadoso que mantiene este espacio seguro. Tu información se mantiene privada y solo se usa para revisar tu solicitud."}
        </p>
      </div>
    </div>
  );
}
