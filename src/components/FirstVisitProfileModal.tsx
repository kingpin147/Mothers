"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { submitFirstVisitProfile, validateGodmotherCode } from "@/app/actions/memberAccount";

function FirstVisitProfileModalContent() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const { language: lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Required Fields: stage and neighbourhood
  const [stages, setStages] = useState<string[]>([]);
  const [neighbourhood, setNeighbourhood] = useState("");
  const [hoping, setHoping] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [heard, setHeard] = useState("");
  const [godmotherCode, setGodmotherCode] = useState("");
  const [godmotherStatus, setGodmotherStatus] = useState<{
    checking?: boolean;
    valid?: boolean;
    name?: string;
    error?: string;
  }>({});
  const [social, setSocial] = useState("");
  const [why, setWhy] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Check if modal should open: after first booking confirmed OR first My Account open
  // The modal is shown until profileDone — it is blocking, no skip
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (session?.user) {
      const user = session.user as any;
      // Trigger on first-booking flag or my-account flag, but not on sign-in or top-up pages
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isOnSignIn = path.includes("/account/login") || path.includes("/account/signup");
      const isOnTopUp = path.includes("/topup");
      const isInBookingFlow = path.includes("/events/") && searchParams?.get("booking") === "done";
      const isMyAccount = path.includes("/account") && !isOnSignIn && !isOnTopUp;
      const hasFirstBooking = sessionStorage.getItem("tm_first_booking_done") === "1";

      if (user.profileDone === false && !isOnSignIn && !isOnTopUp && (isMyAccount || isInBookingFlow || hasFirstBooking)) {
        setIsOpen(true);
      }
    }
  }, [session, searchParams]);

  const handleClose = useCallback(() => {
    // Blocking modal — only close on successful submit
    return;
  }, []);

  // No ESC key dismiss — modal is blocking until profile is completed

  const toggleStage = (item: string) => {
    setStages((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const toggleHoping = (item: string) => {
    setHoping((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const toggleAvailability = (item: string) => {
    setAvailability((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  // Live Godmother check
  const handleCheckGodmother = async (code: string) => {
    setGodmotherCode(code);
    if (!code || code.trim().length < 4) {
      setGodmotherStatus({});
      return;
    }

    setGodmotherStatus({ checking: true });
    try {
      const res = await validateGodmotherCode(code.trim());
      if (res.valid) {
        setGodmotherStatus({ valid: true, name: res.godmotherName });
      } else {
        setGodmotherStatus({ valid: false, error: res.error });
      }
    } catch {
      setGodmotherStatus({ valid: false, error: "Validation failed" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stages.length === 0) {
      setFormError(
        lang === "en"
          ? "Please select at least one stage of motherhood."
          : "Por favor selecciona al menos una etapa de maternidad."
      );
      return;
    }
    if (!neighbourhood) {
      setFormError(
        lang === "en"
          ? "Please select your neighbourhood."
          : "Por favor selecciona tu barrio."
      );
      return;
    }
    if (hoping.length === 0) {
      setFormError(
        lang === "en"
          ? "Please tell us what you are hoping to find here."
          : "Por favor dínos qué esperas encontrar aquí."
      );
      return;
    }
    if (availability.length === 0) {
      setFormError(
        lang === "en"
          ? "Please select at least one availability slot."
          : "Por favor selecciona al menos una franja de disponibilidad."
      );
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const res = await submitFirstVisitProfile({
        stages,
        neighbourhood,
        hoping,
        availability,
        heard,
        godmotherCode:
          heard === "friend_godmother" && godmotherCode.trim()
            ? godmotherCode.trim()
            : undefined,
        social: social.trim() || undefined,
        why: why.trim() || undefined,
      });

      if (res.success) {
        if (update) {
          await update({ profileDone: true });
        }
        if (typeof window !== "undefined") {
          sessionStorage.setItem("tm_onboarding_dismissed", "1");
          sessionStorage.removeItem("tm_show_onboarding");
        }
        setIsOpen(false);
      } else {
        setFormError(res.error || "Failed to save profile.");
      }
    } catch (err: any) {
      setFormError(err?.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEn = lang === "en";

  // Blocking modal — clicking the backdrop does nothing
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(57, 41, 42, 0.5)",
        backdropFilter: "blur(3px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#fdf8f2",
          border: "1px solid rgba(57, 41, 42, 0.16)",
          borderRadius: "8px",
          boxShadow: "0 20px 50px rgba(45, 43, 43, 0.2)",
          padding: "clamp(26px, 4vw, 36px)",
          fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
          color: "#39292a",
          margin: "auto",
        }}
      >
        {/* No close button — profile is required before continuing */}

        {/* Header */}
        <div style={{ marginBottom: "22px", paddingRight: "30px" }}>
          <div
            style={{
              fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent, #7b1f2c)",
              marginBottom: "8px",
            }}
          >
            {isEn ? "WELCOME TO THE MOTHERS" : "BIENVENIDA A THE MOTHERS"}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
              fontWeight: 400,
              fontSize: "clamp(24px, 3.5vw, 30px)",
              lineHeight: 1.15,
              color: "#39292a",
              margin: "0 0 10px",
            }}
          >
            {isEn ? "Tell us a little about you & your family." : "Cuéntanos un poco sobre ti y tu familia."}
          </h2>
          <p
            style={{
              fontSize: "14.5px",
              lineHeight: 1.6,
              color: "rgba(57, 41, 42, 0.72)",
              margin: 0,
            }}
          >
            {isEn
              ? "This helps us tailor gatherings, connect you with local mothers, and credit your Godmother if you were invited."
              : "Esto nos ayuda a organizar encuentros, conectarte con madres de tu barrio y premiar a tu Madrina si vienes recomendada."}
          </p>
        </div>

        {/* Error Alert */}
        {formError && (
          <div
            style={{
              padding: "11px 14px",
              marginBottom: "20px",
              backgroundColor: "rgba(153, 56, 66, 0.08)",
              border: "1px solid rgba(153, 56, 66, 0.25)",
              borderRadius: "5px",
              color: "#993842",
              fontSize: "13.5px",
              lineHeight: 1.5,
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* 1. Stages */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#39292a",
                marginBottom: "8px",
              }}
            >
              {isEn ? "1. Stage of motherhood (Select all that apply) *" : "1. Etapa de maternidad (Selecciona todas las que apliquen) *"}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { id: "expecting", en: "Pregnant / Expecting", es: "Embarazada" },
                { id: "babies", en: "Babies (0-12 months)", es: "Bebés (0-12 meses)" },
                { id: "toddlers", en: "Toddlers (1-3 years)", es: "Deambuladores (1-3 años)" },
                { id: "children36", en: "Children (3-6 years)", es: "Niños (3-6 años)" },
                { id: "children610", en: "Older children (6-10 years)", es: "Niños mayores (6-10 años)" },
                { id: "big_kids", en: "Big kids (10+)", es: "Niños grandes (10+)" },
              ].map((s) => {
                const active = stages.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStage(s.id)}
                    style={{
                      border: active ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.22)",
                      backgroundColor: active ? "rgba(123, 31, 44, 0.08)" : "#ffffff",
                      color: active ? "#7b1f2c" : "#39292a",
                      fontWeight: active ? 600 : 400,
                      borderRadius: "20px",
                      padding: "7px 14px",
                      fontSize: "13px",
                      fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isEn ? s.en : s.es}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Neighbourhood */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#39292a",
                marginBottom: "8px",
              }}
            >
              {isEn ? "2. Neighbourhood in Barcelona *" : "2. Barrio en Barcelona *"}
            </label>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid rgba(57, 41, 42, 0.22)",
                borderRadius: "5px",
                backgroundColor: "#ffffff",
                fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                fontSize: "14.5px",
                color: "#39292a",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="">{isEn ? "Select your neighbourhood..." : "Selecciona tu barrio..."}</option>
              <option value="Eixample">Eixample</option>
              <option value="Gràcia">Gràcia</option>
              <option value="Poblenou">Poblenou</option>
              <option value="Sarrià-Sant Gervasi">Sarrià - Sant Gervasi</option>
              <option value="Ciutat Vella">Ciutat Vella (Born, Gòtic, Raval)</option>
              <option value="Les Corts">Les Corts</option>
              <option value="Sants-Montjuïc">Sants - Montjuïc</option>
              <option value="Sant Martí">Sant Martí</option>
              <option value="Horta-Guinardó">Horta - Guinardó</option>
              <option value="Sant Andreu">Sant Andreu</option>
              <option value="Nou Barris">Nou Barris</option>
              <option value="Not sure yet">{isEn ? "Not sure yet" : "Aún no lo sé"}</option>
              <option value="Surrounding / Outside BCN">
                {isEn ? "Surrounding / Outside Barcelona" : "Alrededores / Fuera de Barcelona"}
              </option>
            </select>
          </div>

          {/* 3. Hoping */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#39292a",
                marginBottom: "8px",
              }}
            >
              {isEn ? "3. What are you hoping to find here? *" : "3. ¿Qué esperas encontrar aquí? *"}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { id: "friends", en: "Making mum friends", es: "Hacer amigas madres" },
                { id: "walks", en: "Attending walks & gatherings", es: "Paseos y encuentros" },
                { id: "recs", en: "Local recommendations", es: "Recomendaciones locales" },
                { id: "support", en: "Support & a safe space", es: "Apoyo y espacio seguro" },
                { id: "events", en: "Events & experiences", es: "Eventos y experiencias" },
                { id: "circle", en: "The Circle — our private forum", es: "The Circle — nuestro foro privado" },
              ].map((h) => {
                const active = hoping.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHoping(h.id)}
                    style={{
                      border: active ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.22)",
                      backgroundColor: active ? "rgba(123, 31, 44, 0.08)" : "#ffffff",
                      color: active ? "#7b1f2c" : "#39292a",
                      fontWeight: active ? 600 : 400,
                      borderRadius: "20px",
                      padding: "7px 14px",
                      fontSize: "13px",
                      fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isEn ? h.en : h.es}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Availability */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#39292a",
                marginBottom: "8px",
              }}
            >
              {isEn ? "4. When are you usually free for gatherings? *" : "4. ¿Cuándo sueles tener disponibilidad? *"}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { id: "weekday_morning", en: "Weekday mornings", es: "Mañanas entre semana" },
                { id: "weekday_afternoon", en: "Weekday afternoons", es: "Tardes entre semana" },
                { id: "weekend", en: "Weekends", es: "Fines de semana" },
                { id: "evening", en: "Evenings (mum-only)", es: "Noches (solo madres)" },
              ].map((a) => {
                const active = availability.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAvailability(a.id)}
                    style={{
                      border: active ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.22)",
                      backgroundColor: active ? "rgba(123, 31, 44, 0.08)" : "#ffffff",
                      color: active ? "#7b1f2c" : "#39292a",
                      fontWeight: active ? 600 : 400,
                      borderRadius: "20px",
                      padding: "7px 14px",
                      fontSize: "13px",
                      fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isEn ? a.en : a.es}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. How heard */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#39292a",
                marginBottom: "8px",
              }}
            >
              {isEn ? "5. How did you hear about The Mothers?" : "5. ¿Cómo nos conociste?"}
            </label>
            <select
              value={heard}
              onChange={(e) => {
                setHeard(e.target.value);
                if (e.target.value !== "friend_godmother") {
                  setGodmotherCode("");
                  setGodmotherStatus({});
                }
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid rgba(57, 41, 42, 0.22)",
                borderRadius: "5px",
                backgroundColor: "#ffffff",
                fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                fontSize: "14.5px",
                color: "#39292a",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="">{isEn ? "Select an option..." : "Selecciona una opción..."}</option>
              <option value="friend_godmother">
                {isEn ? "A friend / Godmother invite" : "Una amiga / Invitación de Madrina"}
              </option>
              <option value="instagram">Instagram</option>
              <option value="word_of_mouth">
                {isEn ? "Word of mouth / Other mothers" : "Boca a boca / Otras madres"}
              </option>
              <option value="google">{isEn ? "Google / Search" : "Búsqueda en Google"}</option>
              <option value="partner_venue">
                {isEn ? "Partner venue / Cafe" : "Local asociado / Cafetería"}
              </option>
              <option value="other">{isEn ? "Other" : "Otro"}</option>
            </select>
          </div>

          {/* 6. Godmother Code (Live Check) */}
          {heard === "friend_godmother" && (
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#39292a",
                  marginBottom: "8px",
                }}
              >
                {isEn ? "6. Godmother referral code" : "6. Código de Madrina"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={godmotherCode}
                  onChange={(e) => handleCheckGodmother(e.target.value.toUpperCase())}
                  placeholder="e.g. ANDREA-M4F2"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: godmotherStatus.valid
                      ? "1px solid #568b05"
                      : godmotherStatus.error
                      ? "1px solid #993842"
                      : "1px solid rgba(57, 41, 42, 0.22)",
                    borderRadius: "5px",
                    backgroundColor: "#ffffff",
                    fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                    fontSize: "14.5px",
                    color: "#39292a",
                    boxSizing: "border-box",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    outline: "none",
                  }}
                />
              </div>
              {godmotherStatus.checking && (
                <span style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.6)", marginTop: "4px", display: "block" }}>
                  {isEn ? "Checking code..." : "Comprobando código..."}
                </span>
              )}
              {godmotherStatus.valid && (
                <span style={{ fontSize: "13px", color: "#568b05", marginTop: "4px", display: "block", fontWeight: 600 }}>
                  ✓ {isEn ? `Referred by ${godmotherStatus.name}` : `Recomendada por ${godmotherStatus.name}`}
                </span>
              )}
              {godmotherStatus.error && (
                <span style={{ fontSize: "12.5px", color: "#993842", marginTop: "4px", display: "block" }}>
                  ✕ {godmotherStatus.error}
                </span>
              )}
            </div>
          )}

          {/* 7. Social handle */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#39292a",
                marginBottom: "8px",
              }}
            >
              {isEn ? "7. WhatsApp or Instagram handle (Optional)" : "7. WhatsApp o usuario de Instagram (Opcional)"}
            </label>
            <input
              type="text"
              value={social}
              onChange={(e) => setSocial(e.target.value)}
              placeholder="@yourhandle or +34 600 000 000"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid rgba(57, 41, 42, 0.22)",
                borderRadius: "5px",
                backgroundColor: "#ffffff",
                fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                fontSize: "14.5px",
                color: "#39292a",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* 8. Why joined */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#39292a",
                marginBottom: "8px",
              }}
            >
              {isEn
                ? "8. A few words on why you joined The Mothers (Optional)"
                : "8. Unas palabras sobre por qué te unes a The Mothers (Opcional)"}
            </label>
            <textarea
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder={
                isEn
                  ? "e.g. Looking for other mums in Gràcia for weekend coffee and park strolls..."
                  : "ej. Buscando otras madres en Gràcia para pasear los fines de semana..."
              }
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid rgba(57, 41, 42, 0.22)",
                borderRadius: "5px",
                backgroundColor: "#ffffff",
                fontFamily: "var(--font-body, 'Lora', Georgia, serif)",
                fontSize: "14.5px",
                color: "#39292a",
                boxSizing: "border-box",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>

          {/* Bottom Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              marginTop: "10px",
              paddingTop: "16px",
              borderTop: "1px solid rgba(57, 41, 42, 0.12)",
            }}
          >
            {/* No skip button — profile must be completed */}

            <button
              type="submit"
              disabled={loading}
              style={{
                border: "1px solid #7b1f2c",
                backgroundColor: "#7b1f2c",
                color: "#fdf8f2",
                borderRadius: "4px",
                padding: "12px 24px",
                fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)",
                fontWeight: 600,
                fontSize: "15.5px",
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.02em",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = "0.92";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {loading
                ? isEn
                  ? "Saving..."
                  : "Guardando..."
                : isEn
                ? "Complete profile & enter"
                : "Completar perfil y entrar"}
            </button>
          </div>
        </form>
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
