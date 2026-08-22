"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { submitApplication, ApplicationFormData } from "@/app/actions/application";

export default function MembershipApplicationPage() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<ApplicationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    stage: "Pregnancy",
    childrenAge: "",
    neighbourhood: "Eixample",
    hopingToFind: ["Friendships nearby"],
    freeTimes: ["Weekday mornings"],
    referralSource: "Instagram",
    socialPlatform: "Instagram",
    socialHandle: "",
    motivation: "",
    billingPreference: "monthly",
    termsAccepted: false,
    locale: "en",
  });

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") {
      setLang(saved);
      setFormData((prev) => ({ ...prev, locale: saved }));
    }
  }, []);

  const totalSteps = 11;

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1 && !formData.firstName.trim()) {
      setErrorMsg(lang === "en" ? "Please enter your first name." : "Por favor escribe tu nombre.");
      return;
    }
    if (step === 2 && (!formData.email.trim() || !formData.email.includes("@"))) {
      setErrorMsg(lang === "en" ? "Please enter a valid email address." : "Por favor escribe un correo válido.");
      return;
    }
    if (step === 6 && formData.hopingToFind.length === 0) {
      setErrorMsg(lang === "en" ? "Please select at least one option." : "Por favor selecciona al menos una opción.");
      return;
    }
    if (step === 7 && formData.freeTimes.length === 0) {
      setErrorMsg(lang === "en" ? "Please select at least one option." : "Por favor selecciona al menos una opción.");
      return;
    }

    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const toggleChip = (field: "hopingToFind" | "freeTimes", val: string) => {
    setFormData((prev) => {
      const list = prev[field];
      if (list.includes(val)) {
        return { ...prev, [field]: list.filter((item) => item !== val) };
      } else {
        return { ...prev, [field]: [...list, val] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.termsAccepted) {
      setErrorMsg(
        lang === "en"
          ? "Please accept the Terms and Privacy Policy to continue."
          : "Por favor acepta los Términos y la Política de Privacidad para continuar."
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const res = await submitApplication(formData);
    setLoading(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setErrorMsg(res.error || "Submission failed. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: "640px", margin: "80px auto", padding: "32px", textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: "14px",
          color: "var(--color-accent-2)",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          marginBottom: "12px"
        }}>
          {lang === "en" ? "Application received" : "Solicitud recibida"}
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "36px", marginBottom: "20px" }}>
          {lang === "en" ? "Thank you for applying, " + formData.firstName : "Gracias por tu solicitud, " + formData.firstName}
        </h1>
        <p style={{ fontSize: "16px", lineHeight: "1.65", color: "var(--color-text-muted)", marginBottom: "32px" }}>
          {lang === "en"
            ? "We review every application individually. You'll get an email letting you know whether you've been accepted — if you have, it'll include your 72-hour payment link to confirm your place."
            : "Revisamos cada solicitud de forma individual. Recibirás un correo indicándote si has sido aceptada — si lo eres, incluirá tu enlace de pago de 72 horas para confirmar tu plaza."}
        </p>
        <Link href="/" className="btn btn-primary">
          {lang === "en" ? "Return to Homepage" : "Volver al Inicio"}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "640px", margin: "60px auto", padding: "0 24px 80px" }}>
      {/* Step Indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 600, color: "var(--color-accent)" }}>
          {lang === "en" ? `Step ${step} of ${totalSteps}` : `Paso ${step} de ${totalSteps}`}
        </span>
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "inherit"
            }}
          >
            ← {lang === "en" ? "Back" : "Atrás"}
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="card" style={{ padding: "clamp(24px, 4vw, 40px)", backgroundColor: "#fdf9f2" }}>
        {errorMsg && (
          <div style={{
            backgroundColor: "var(--color-status-cancelled)",
            color: "#993842",
            padding: "10px 14px",
            borderRadius: "4px",
            fontSize: "14px",
            marginBottom: "20px"
          }}>
            {errorMsg}
          </div>
        )}

        {/* Step 1: Names */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "First — what should we call you?" : "Primero — ¿cómo te llamamos?"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "Your surname stays private; members only ever see your first name."
                : "Tu apellido se mantiene privado; las socias solo ven tu nombre."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  {lang === "en" ? "First Name (required)" : "Nombre (obligatorio)"}
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="e.g. Maria"
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  {lang === "en" ? "Surname (optional)" : "Apellido (opcional)"}
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.lastName || ""}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="e.g. Garcia"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Email */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "How can we reach you?" : "¿Cómo podemos contactarte?"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "Your email is all we need to review this and welcome you in. We'll ask for a phone number once you're a member — not before."
                : "Con tu correo nos basta para revisar la solicitud y darte la bienvenida. El teléfono te lo pediremos cuando ya seas socia, no antes."}
            </p>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                {lang === "en" ? "Email Address (required)" : "Correo electrónico (obligatorio)"}
              </label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="maria@example.com"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 3: Stage */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "Which stage are you in right now?" : "¿En qué etapa estás ahora mismo?"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "It helps us plan events for the stage you are actually in."
                : "Nos ayuda a programar encuentros para la etapa en la que estás."}
            </p>
            <select
              className="input"
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            >
              <option value="Pregnancy">{lang === "en" ? "Pregnancy" : "Embarazo"}</option>
              <option value="Postpartum (0–12 months)">{lang === "en" ? "Postpartum (0–12 months)" : "Posparto (0–12 meses)"}</option>
              <option value="Toddlerhood (1–3 years)">{lang === "en" ? "Toddlerhood (1–3 years)" : "Primera infancia (1–3 años)"}</option>
              <option value="Primary school (4–10 years)">{lang === "en" ? "Primary school (4–10 years)" : "Etapa escolar (4–10 años)"}</option>
              <option value="More than one stage at once">{lang === "en" ? "More than one stage at once" : "Más de una etapa a la vez"}</option>
            </select>
          </div>
        )}

        {/* Step 4: Children's Ages */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "What are your children's ages? (Optional)" : "¿Qué edades tienen tus hijos/as? (Opcional)"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "So we can organize play dates by age group. If you're expecting, just share your due date range."
                : "Así podemos organizar encuentros por grupo de edad. Si estás embarazada, comparte tu rango previsto."}
            </p>
            <select
              className="input"
              value={formData.childrenAge || ""}
              onChange={(e) => setFormData({ ...formData, childrenAge: e.target.value })}
            >
              <option value="">{lang === "en" ? "Select age range (optional)" : "Seleccionar rango (opcional)"}</option>
              <option value="Expecting">{lang === "en" ? "Expecting" : "Embarazada"}</option>
              <option value="0–6 months">{lang === "en" ? "0–6 months" : "0–6 meses"}</option>
              <option value="6–12 months">{lang === "en" ? "6–12 months" : "6–12 meses"}</option>
              <option value="1–3 years">{lang === "en" ? "1–3 years" : "1–3 años"}</option>
              <option value="3–6 years">{lang === "en" ? "3–6 years" : "3–6 años"}</option>
              <option value="6–10 years">{lang === "en" ? "6–10 years" : "6–10 años"}</option>
              <option value="More than one age range">{lang === "en" ? "More than one age range" : "Más de un rango de edad"}</option>
            </select>
          </div>
        )}

        {/* Step 5: Neighbourhood */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "Which neighbourhood are you in?" : "¿En qué barrio estás?"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en" ? "So we can host events close to you." : "Así organizamos encuentros cerca de ti."}
            </p>
            <select
              className="input"
              value={formData.neighbourhood}
              onChange={(e) => setFormData({ ...formData, neighbourhood: e.target.value })}
            >
              <option value="Ciutat Vella">Ciutat Vella</option>
              <option value="Eixample">Eixample</option>
              <option value="Sants-Montjuïc">Sants-Montjuïc</option>
              <option value="Les Corts">Les Corts</option>
              <option value="Sarrià-Sant Gervasi">Sarrià-Sant Gervasi</option>
              <option value="Gràcia">Gràcia</option>
              <option value="Horta-Guinardó">Horta-Guinardó</option>
              <option value="Nou Barris">Nou Barris</option>
              <option value="Sant Andreu">Sant Andreu</option>
              <option value="Sant Martí">Sant Martí</option>
              <option value="Outside Barcelona">{lang === "en" ? "Outside Barcelona" : "Fuera de Barcelona"}</option>
              <option value="Not sure yet">{lang === "en" ? "Not sure yet" : "Aún no lo sé"}</option>
            </select>
          </div>
        )}

        {/* Step 6: Hoping to find */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "What are you hoping to find?" : "¿Qué esperas encontrar?"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "Choose all that resonate — it helps us understand what matters to you."
                : "Elige todas las que resuenen — nos ayuda a entender qué te importa."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {[
                { en: "Friendships nearby", es: "Amistades cercanas" },
                { en: "Activity partners", es: "Compañeras de actividades" },
                { en: "Emotional support", es: "Apoyo emocional" },
                { en: "Expert recommendations", es: "Recomendaciones de expertas" },
                { en: "Walks & socials", es: "Paseos y encuentros" },
              ].map((opt) => {
                const isSelected = formData.hopingToFind.includes(opt.en);
                return (
                  <button
                    key={opt.en}
                    type="button"
                    onClick={() => toggleChip("hopingToFind", opt.en)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: isSelected ? "1px solid var(--color-accent)" : "1px solid var(--color-divider)",
                      backgroundColor: isSelected ? "var(--color-accent)" : "#fff",
                      color: isSelected ? "#fff" : "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {lang === "en" ? opt.en : opt.es}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 7: Free times */}
        {step === 7 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "When are you usually free?" : "¿Cuándo suele quedar libre tu agenda?"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "We'll use this to schedule walks and socials you can actually make."
                : "Lo usaremos para programar paseos y encuentros que puedas hacer de verdad."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {[
                { en: "Weekday mornings", es: "Mañanas entre semana" },
                { en: "Weekday afternoons", es: "Tardes entre semana" },
                { en: "Evenings", es: "Noches" },
                { en: "Weekends", es: "Fines de semana" },
              ].map((opt) => {
                const isSelected = formData.freeTimes.includes(opt.en);
                return (
                  <button
                    key={opt.en}
                    type="button"
                    onClick={() => toggleChip("freeTimes", opt.en)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: isSelected ? "1px solid var(--color-accent)" : "1px solid var(--color-divider)",
                      backgroundColor: isSelected ? "var(--color-accent)" : "#fff",
                      color: isSelected ? "#fff" : "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {lang === "en" ? opt.en : opt.es}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 8: Referral Source */}
        {step === 8 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "How did you hear about The Mothers? (Optional)" : "¿Cómo conociste The Mothers? (Opcional)"}
            </h2>
            <select
              className="input"
              value={formData.referralSource || ""}
              onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
            >
              <option value="Instagram">Instagram</option>
              <option value="A friend or member">{lang === "en" ? "A friend or member" : "Una amiga o socia"}</option>
              <option value="Google search">{lang === "en" ? "Google search" : "Búsqueda en Google"}</option>
              <option value="An event">{lang === "en" ? "An event" : "Un evento"}</option>
              <option value="Other">{lang === "en" ? "Other" : "Otro"}</option>
            </select>
          </div>
        )}

        {/* Step 9: Social Handle */}
        {step === 9 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "What's your social media handle? (Optional)" : "¿Cuál es tu usuario de redes sociales? (Opcional)"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "Totally optional — it just helps us get to know you a little better before you join."
                : "Totalmente opcional — solo nos ayuda a conocerte un poco mejor antes de que te unas."}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <select
                className="input"
                style={{ width: "140px" }}
                value={formData.socialPlatform}
                onChange={(e) => setFormData({ ...formData, socialPlatform: e.target.value })}
              >
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="Facebook">Facebook</option>
                <option value="Other">{lang === "en" ? "Other" : "Otro"}</option>
              </select>
              <input
                type="text"
                className="input"
                value={formData.socialHandle || ""}
                onChange={(e) => setFormData({ ...formData, socialHandle: e.target.value })}
                placeholder="@yourhandle"
              />
            </div>
          </div>
        )}

        {/* Step 10: Motivation */}
        {step === 10 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "What made you look for this? (Optional)" : "¿Qué te hizo buscar esto? (Opcional)"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "A couple of sentences is plenty. This isn't screening — it's so whoever hosts your first walk can greet you like someone she was expecting."
                : "Con un par de frases es suficiente. No es un filtro: es para que quien reciba tu primer paseo te salude como a alguien a quien esperaba."}
            </p>
            <textarea
              className="input"
              rows={4}
              value={formData.motivation || ""}
              onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
              placeholder={lang === "en" ? "A couple of sentences is plenty…" : "Con un par de frases es suficiente…"}
            />
          </div>
        )}

        {/* Step 11: Billing & Consent */}
        {step === 11 && (
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "Billing preference" : "Preferencia de facturación"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
              {lang === "en"
                ? "Choose monthly or quarterly — this is how we schedule your billing if accepted."
                : "Elige mensual o trimestral — así programamos tu facturación si eres aceptada."}
            </p>
            <select
              className="input"
              value={formData.billingPreference}
              onChange={(e) => setFormData({ ...formData, billingPreference: e.target.value })}
              style={{ marginBottom: "24px" }}
            >
              <option value="monthly">
                {lang === "en"
                  ? "Monthly — €29/month (Founding Rate)"
                  : "Mensual — 29€/mes (Tarifa Fundadora)"}
              </option>
              <option value="quarterly">
                {lang === "en"
                  ? "Quarterly — €79/quarter (Founding Rate)"
                  : "Trimestral — 79€/trimestre (Tarifa Fundadora)"}
              </option>
            </select>

            <div style={{
              border: "1px solid rgba(123, 31, 44, 0.35)",
              borderRadius: "6px",
              padding: "16px",
              backgroundColor: "#fff"
            }}>
              <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                  style={{ marginTop: "3px" }}
                />
                <span>
                  {lang === "en" ? (
                    <>
                      I agree to the <Link href="/terms" target="_blank" style={{ textDecoration: "underline" }}>Terms & Conditions</Link> and{" "}
                      <Link href="/privacy" target="_blank" style={{ textDecoration: "underline" }}>Privacy Policy</Link>.
                    </>
                  ) : (
                    <>
                      Acepto los <Link href="/terms" target="_blank" style={{ textDecoration: "underline" }}>Términos y Condiciones</Link> y la{" "}
                      <Link href="/privacy" target="_blank" style={{ textDecoration: "underline" }}>Política de Privacidad</Link>.
                    </>
                  )}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: "12px 28px", fontSize: "15px" }}
          >
            {loading
              ? lang === "en"
                ? "Submitting..."
                : "Enviando..."
              : step === totalSteps
              ? lang === "en"
                ? "Submit Application"
                : "Enviar Solicitud"
              : lang === "en"
              ? "Continue →"
              : "Continuar →"}
          </button>
        </div>
      </div>

      {/* Privacy Guarantee footnote */}
      <p style={{
        textAlign: "center",
        fontSize: "12.5px",
        color: "var(--color-text-subtle)",
        marginTop: "20px",
        lineHeight: "1.5"
      }}>
        {lang === "en"
          ? "Applications are reviewed individually — a short, light-touch step that keeps this space feeling safe. Your information is kept private and used only to review your application."
          : "Las solicitudes se revisan de forma individual — un paso breve y cuidadoso que mantiene este espacio seguro. Tu información se mantiene privada y solo se usa para revisar tu solicitud."}
      </p>
    </div>
  );
}
