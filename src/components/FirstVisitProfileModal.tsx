"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { submitFirstVisitProfile, validateGodmotherCode } from "@/app/actions/memberAccount";

export function FirstVisitProfileModal() {
  const { data: session } = useSession();
  const { language: lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // 8 Required Fields (§A-01)
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

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      if (user.profileDone === false) {
        setIsOpen(true);
      }
    }
  }, [session]);

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

  // Live Godmother check (§A-01 / A-02)
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
      setFormError(lang === "en" ? "Please select at least one stage." : "Por favor selecciona al menos una etapa.");
      return;
    }
    if (!neighbourhood) {
      setFormError(lang === "en" ? "Please select your neighbourhood." : "Por favor selecciona tu barrio.");
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
        godmotherCode: godmotherCode.trim() || undefined,
        social: social.trim() || undefined,
        why: why.trim() || undefined,
      });

      if (res.success) {
        setIsOpen(false);
        window.location.reload();
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(57, 41, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "#fdf8f2",
          border: "1px solid rgba(57, 41, 42, 0.2)",
          borderRadius: "8px",
          boxShadow: "0 16px 40px rgba(57, 41, 42, 0.25)",
          padding: "32px 36px",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "6px",
            }}
          >
            {isEn ? "Welcome to The Mothers" : "Bienvenida a The Mothers"}
          </div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 400,
              fontSize: "28px",
              lineHeight: 1.15,
              margin: "0 0 10px",
            }}
          >
            {isEn ? "Tell us a little about you & your family." : "Cuéntanos un poco sobre ti y tu familia."}
          </h2>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
            {isEn
              ? "This helps us tailor gatherings, connect you with local mothers, and credit your Godmother if you were invited."
              : "Esto nos ayuda a organizar encuentros, conectarte con madres de tu barrio y premiar a tu Madrina si vienes recomendada."}
          </p>
        </div>

        {formError && (
          <div
            style={{
              padding: "10px 14px",
              marginBottom: "16px",
              backgroundColor: "rgba(153, 56, 66, 0.08)",
              border: "1px solid #993842",
              borderRadius: "4px",
              color: "#993842",
              fontSize: "13.5px",
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* 1. Stages */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "1. Stage of motherhood (Select all that apply) *" : "1. Etapa de maternidad (Selecciona todas las que apliquen) *"}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "expecting", en: "Expecting / Pregnant", es: "Embarazada" },
                { id: "newborn", en: "Newborn (0-6 months)", es: "Recién nacido (0-6 meses)" },
                { id: "baby", en: "Baby (6-12 months)", es: "Bebé (6-12 meses)" },
                { id: "toddler", en: "Toddler (1-3 years)", es: "Deambulador (1-3 años)" },
                { id: "child", en: "Child (4+ years)", es: "Infantil (4+ años)" },
                { id: "trying", en: "Trying to conceive", es: "Buscando embarazo" },
              ].map((s) => {
                const active = stages.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStage(s.id)}
                    style={{
                      border: active ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                      backgroundColor: active ? "rgba(123, 31, 44, 0.08)" : "#ffffff",
                      color: active ? "#7b1f2c" : "#39292a",
                      fontWeight: active ? 600 : 400,
                      borderRadius: "16px",
                      padding: "6px 12px",
                      fontSize: "13px",
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
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "2. Neighbourhood in Barcelona *" : "2. Barrio en Barcelona *"}
            </label>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#39292a",
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
              <option value="Surrounding / Outside BCN">{isEn ? "Surrounding / Outside Barcelona" : "Alrededores / Fuera de Barcelona"}</option>
            </select>
          </div>

          {/* 3. Hoping */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "3. What are you hoping to find here?" : "3. ¿Qué esperas encontrar aquí?"}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "friends", en: "Making mum friends", es: "Hacer amigas madres" },
                { id: "walks", en: "Attending walks & gatherings", es: "Paseos y encuentros" },
                { id: "recs", en: "Local recommendations", es: "Recomendaciones locales" },
                { id: "support", en: "Shared support & advice", es: "Apoyo y consejo mutuo" },
                { id: "village", en: "Building a village", es: "Construir tribu" },
              ].map((h) => {
                const active = hoping.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHoping(h.id)}
                    style={{
                      border: active ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                      backgroundColor: active ? "rgba(123, 31, 44, 0.08)" : "#ffffff",
                      color: active ? "#7b1f2c" : "#39292a",
                      fontWeight: active ? 600 : 400,
                      borderRadius: "16px",
                      padding: "6px 12px",
                      fontSize: "13px",
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
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "4. When are you usually free for gatherings?" : "4. ¿Cuándo sueles tener disponibilidad?"}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
                      border: active ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                      backgroundColor: active ? "rgba(123, 31, 44, 0.08)" : "#ffffff",
                      color: active ? "#7b1f2c" : "#39292a",
                      fontWeight: active ? 600 : 400,
                      borderRadius: "16px",
                      padding: "6px 12px",
                      fontSize: "13px",
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
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "5. How did you hear about The Mothers?" : "5. ¿Cómo nos conociste?"}
            </label>
            <select
              value={heard}
              onChange={(e) => setHeard(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#39292a",
              }}
            >
              <option value="">{isEn ? "Select an option..." : "Selecciona una opción..."}</option>
              <option value="friend_godmother">{isEn ? "A friend / Godmother invite" : "Una amiga / Invitación de Madrina"}</option>
              <option value="instagram">Instagram</option>
              <option value="word_of_mouth">{isEn ? "Word of mouth / Other mothers" : "Boca a boca / Otras madres"}</option>
              <option value="google">{isEn ? "Google / Search" : "Búsqueda en Google"}</option>
              <option value="partner_venue">{isEn ? "Partner venue / Cafe" : "Local asociado / Cafetería"}</option>
              <option value="other">{isEn ? "Other" : "Otro"}</option>
            </select>
          </div>

          {/* 6. Godmother Code (Live Check) */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "6. Godmother referral code (Optional)" : "6. Código de Madrina (Opcional)"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={godmotherCode}
                onChange={(e) => handleCheckGodmother(e.target.value.toUpperCase())}
                placeholder="e.g. MOTHERS-MARIA-BCN"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: godmotherStatus.valid
                    ? "1px solid #568b05"
                    : godmotherStatus.error
                    ? "1px solid #993842"
                    : "1px solid rgba(57, 41, 42, 0.24)",
                  borderRadius: "4px",
                  backgroundColor: "#ffffff",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "14px",
                  color: "#39292a",
                  boxSizing: "border-box",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              />
            </div>
            {godmotherStatus.checking && (
              <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)", marginTop: "4px", display: "block" }}>
                {isEn ? "Checking code..." : "Comprobando código..."}
              </span>
            )}
            {godmotherStatus.valid && (
              <span style={{ fontSize: "12.5px", color: "#568b05", marginTop: "4px", display: "block", fontWeight: 600 }}>
                ✓ {isEn ? `Referred by ${godmotherStatus.name}` : `Recomendada por ${godmotherStatus.name}`}
              </span>
            )}
            {godmotherStatus.error && (
              <span style={{ fontSize: "12px", color: "#993842", marginTop: "4px", display: "block" }}>
                ✕ {godmotherStatus.error}
              </span>
            )}
          </div>

          {/* 7. Social handle */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "7. WhatsApp or Instagram handle (Optional)" : "7. WhatsApp o usuario de Instagram (Opcional)"}
            </label>
            <input
              type="text"
              value={social}
              onChange={(e) => setSocial(e.target.value)}
              placeholder="@yourhandle or +34 600 000 000"
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#39292a",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 8. Why joined */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "8. A few words on why you joined The Mothers (Optional)" : "8. Unas palabras sobre por qué te unes a The Mothers (Opcional)"}
            </label>
            <textarea
              rows={2}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder={isEn ? "e.g. Looking for other mums in Gràcia for weekend coffee and park strolls..." : "ej. Buscando otras madres en Gràcia para pasear los fines de semana..."}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#39292a",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          {/* Submit CTA */}
          <div style={{ marginTop: "10px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                border: "1px solid #7b1f2c",
                backgroundColor: "#7b1f2c",
                color: "#fdf8f2",
                borderRadius: "4px",
                padding: "13px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "16px",
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {loading ? (isEn ? "Saving..." : "Guardando...") : (isEn ? "Complete profile & enter" : "Completar perfil y entrar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
