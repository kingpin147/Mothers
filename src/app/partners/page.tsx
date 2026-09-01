"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";
import { getPublicPartners, submitPartnerApplication } from "@/app/actions/publicWindow";

const UMBRELLAS = [
  { id: "all", labelEn: "All partners", labelEs: "Todos los partners", noteEn: "One exclusive partner per specialty, across five umbrellas — so a body need, an expert need, a child need, a place and a shop all sit inside the network.", noteEs: "Un partner exclusivo por especialidad, en cinco grandes áreas — para que el cuerpo, la experta, el peque, el lugar y la tienda estén todos dentro de la red." },
  { id: "wellness", labelEn: "Wellness & Movement", labelEs: "Bienestar y movimiento", noteEn: "Body-focused, recurring — for you.", noteEs: "Para tu cuerpo, con continuidad." },
  { id: "expert", labelEn: "Expert Care & Support", labelEs: "Cuidado experto", noteEn: "Qualified professionals, workshop-led.", noteEs: "Profesionales cualificadas, con talleres." },
  { id: "child", labelEn: "Baby & Child Activities", labelEs: "Actividades para el bebé", noteEn: "Built around the child being present.", noteEs: "Pensadas para venir con peque." },
  { id: "places", labelEn: "Places & Hospitality", labelEs: "Lugares y hostelería", noteEn: "Spaces we book again and again.", noteEs: "Espacios a los que volvemos." },
  { id: "brands", labelEn: "Brands & Retail", labelEs: "Marcas y retail", noteEn: "Perks only — no events, no calendar.", noteEs: "Solo ventajas — sin eventos ni agenda." },
];

const APPLY_STRINGS = {
  en: {
    heading: 'Want to partner with us?',
    sub: "We're always looking for specialists our members will love. Tell us about your business below.",
    nameLabel: 'Your name', businessLabel: 'Business / studio name',
    categoryLabel: 'What you do', categoryPlaceholder: 'e.g. pelvic-floor physiotherapy, family café, baby swim school', emailLabel: 'Email', websiteLabel: 'Website (optional)',
    messageLabel: 'Tell us about what you offer',
    required: 'Please fill in your name, business name, and email to continue.',
    submitLabel: 'Send application',
    confirmTitle: 'Thank you!',
    confirmBody: "We've received your application and will be in touch within a few days."
  },
  es: {
    heading: '¿Quieres ser partner?',
    sub: 'Siempre buscamos especialistas que nuestras socias van a adorar. Cuéntanos sobre tu negocio.',
    nameLabel: 'Tu nombre', businessLabel: 'Nombre del negocio / estudio',
    categoryLabel: 'A qué te dedicas', categoryPlaceholder: 'ej. fisioterapia de suelo pélvico, café familiar, escuela de natación para bebés', emailLabel: 'Correo electrónico', websiteLabel: 'Sitio web (opcional)',
    messageLabel: 'Cuéntanos qué ofreces',
    required: 'Completa tu nombre, el nombre del negocio y tu correo para continuar.',
    submitLabel: 'Enviar solicitud',
    confirmTitle: '¡Gracias!',
    confirmBody: 'Hemos recibido tu solicitud y te contactaremos en los próximos días.'
  }
};

export default function PartnersPage() {
  const [lang, setLang] = useState<Locale>("en");
  const [activeUmbrella, setActiveUmbrella] = useState<string>("all");
  
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formName, setFormName] = useState("");
  const [formBusiness, setFormBusiness] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formTouched, setFormTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPartners = async () => {
      const res = await getPublicPartners();
      if (res.success && res.partners) {
        setPartners(res.partners);
      }
      setLoading(false);
    };
    fetchPartners();
  }, []);

  const isFormValid = () => {
    return formName.trim().length > 0 && formBusiness.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail);
  };

  const submitForm = async () => {
    if (!isFormValid()) {
      setFormTouched(true);
      return;
    }
    setSubmitting(true);
    const res = await submitPartnerApplication({
      name: formName,
      business: formBusiness,
      category: formCategory,
      email: formEmail,
      website: formWebsite,
      message: formMessage,
    });
    setSubmitting(false);
    if (res.success) {
      setSubmitted(true);
    } else {
      alert("Something went wrong. Please try again.");
    }
  };

  const t = lang === "en" ? APPLY_STRINGS.en : APPLY_STRINGS.es;

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const activeObj = UMBRELLAS.find((u) => u.id === activeUmbrella) || UMBRELLAS[0];
  const visiblePartners = activeUmbrella === "all" ? partners : partners.filter((p) => p.umbrella === activeUmbrella);

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "14px",
            }}
          >
            {lang === "en" ? "Our Partners" : "Nuestros Partners"}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(34px, 5vw, 54px)",
              lineHeight: 1.1,
              marginBottom: "16px",
            }}
          >
            {lang === "en"
              ? "The specialists behind every experience."
              : "Las especialistas detrás de cada experiencia."}
          </h1>
          <p style={{ fontSize: "16.5px", color: "var(--color-text-muted)", maxWidth: "640px", margin: "0 auto" }}>
            {lang === "en"
              ? "One trusted partner per specialty — vetted, exclusive, and here for the long run. See who we work with, and why."
              : "Un partner de confianza por especialidad — seleccionado, exclusivo y aquí para quedarse. Descubre con quién trabajamos y por qué."}
          </p>
        </div>

        {/* Umbrella Filter Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: "16px" }}>
          {UMBRELLAS.map((u) => {
            const isSelected = activeUmbrella === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setActiveUmbrella(u.id)}
                style={{
                  border: isSelected ? "1px solid var(--color-accent)" : "1px solid rgba(57, 41, 42, 0.22)",
                  color: isSelected ? "var(--color-accent)" : "var(--color-text)",
                  backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                  padding: "9px 18px",
                  borderRadius: "20px",
                  fontSize: "13.5px",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {lang === "en" ? u.labelEn : u.labelEs}
              </button>
            );
          })}
        </div>

        <p style={{ textAlign: "center", fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.6)", margin: "0 auto clamp(32px, 4vw, 48px) auto", maxWidth: "600px" }}>
          {lang === "en" ? activeObj.noteEn : activeObj.noteEs}
        </p>

        {/* Partners Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(57,41,42,0.6)" }}>Loading partners...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px", marginBottom: "64px" }}>
            {visiblePartners.map((partner) => {
              // Extract domain for display if link exists in JSON, fallback to links.website
              let websiteDisplay = partner.links?.website || "";
              if (!websiteDisplay && partner.links?.instagram) websiteDisplay = "Instagram";
              
              const linkUrl = partner.links?.website ? (partner.links.website.startsWith('http') ? partner.links.website : `https://${partner.links.website}`) : (partner.links?.instagram ? `https://instagram.com/${partner.links.instagram.replace('@','')}` : "");
              const websiteLabel = partner.links?.website ? partner.links.website.replace(/^https?:\/\/(www\.)?/, '') : (partner.links?.instagram || "");

              return (
                <div
                  key={partner.id}
                  style={{
                    border: "1px solid rgba(57, 41, 42, 0.16)",
                    borderRadius: "8px",
                    padding: "26px 24px",
                    backgroundColor: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      color: "var(--color-accent)",
                      border: "1px solid rgba(123, 31, 44, 0.3)",
                      borderRadius: "10px",
                      padding: "3px 10px",
                      alignSelf: "flex-start",
                      lineHeight: 1.4,
                    }}
                  >
                    {partner.specialty}
                  </span>

                  <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "20px", margin: 0 }}>
                    {partner.name}
                  </h3>

                  <p style={{ fontSize: "14px", lineHeight: "1.55", color: "rgba(57, 41, 42, 0.7)", margin: 0, flex: 1, whiteSpace: "pre-wrap" }}>
                    {partner.description}
                  </p>

                  <div style={{ borderTop: "1px solid rgba(86, 139, 5, 0.25)", paddingTop: "10px" }}>
                    <span style={{ fontSize: "10.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent-2)", fontWeight: 600 }}>
                      {lang === "en" ? "Member benefit" : "Beneficio para socias"}
                    </span>
                    <p style={{ fontSize: "13.5px", lineHeight: "1.5", color: "var(--color-text)", margin: "4px 0 0", fontWeight: 600 }}>
                      {partner.offerForMembers}
                    </p>
                    {partner.discountCode && (
                      <p style={{ fontSize: "12px", margin: "4px 0 0", color: "rgba(57,41,42,0.6)" }}>
                        Code: {partner.discountCode}
                      </p>
                    )}
                  </div>

                  {linkUrl && (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "13px", color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}
                    >
                      {websiteLabel} ↗
                    </a>
                  )}
                </div>
              );
            })}
            
            {visiblePartners.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "rgba(57,41,42,0.6)" }}>
                No partners found in this category yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Partner Application Form */}
      <section style={{ maxWidth: "640px", margin: "0 auto", padding: "0 clamp(24px, 5vw, 64px) clamp(64px, 8vw, 104px)" }}>
        <div style={{ borderTop: "1px solid rgba(57, 41, 42, 0.16)", paddingTop: "clamp(40px, 6vw, 56px)", textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(26px, 3.6vw, 34px)", margin: "0 0 12px" }}>
            {t.heading}
          </h2>
          <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.68)", margin: 0 }}>
            {t.sub}
          </p>
        </div>

        {!submitted ? (
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.18)", borderRadius: "8px", padding: "clamp(28px, 5vw, 40px)", backgroundColor: "#f8efe2", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                  {t.nameLabel}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: "15px", backgroundColor: "#fff" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                  {t.businessLabel}
                </label>
                <input
                  type="text"
                  value={formBusiness}
                  onChange={(e) => setFormBusiness(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: "15px", backgroundColor: "#fff" }}
                />
              </div>
            </div>
            
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                {t.categoryLabel}
              </label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder={t.categoryPlaceholder}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: "15px", backgroundColor: "#f8efe2" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="you@business.com"
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: "15px", backgroundColor: "#fff" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                  {t.websiteLabel}
                </label>
                <input
                  type="text"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="yourbusiness.com"
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: "15px", backgroundColor: "#fff" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                {t.messageLabel}
              </label>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={4}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: "15px", backgroundColor: "#fff", resize: "vertical" }}
              />
            </div>

            {formTouched && !isFormValid() && (
              <p style={{ fontSize: "12.5px", color: "#993842", margin: 0 }}>
                {t.required}
              </p>
            )}

            <button
              type="button"
              onClick={submitForm}
              disabled={submitting}
              style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent)", padding: "13px 26px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", backgroundColor: "transparent", cursor: submitting ? "wait" : "pointer", alignSelf: "flex-start", transition: "background 0.15s ease", opacity: submitting ? 0.7 : 1 }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "rgba(123, 31, 44, 0.1)"}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}
            >
              {submitting ? "Sending..." : t.submitLabel}
            </button>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--color-accent)", borderRadius: "8px", padding: "clamp(32px, 5vw, 44px)", backgroundColor: "#f8efe2", textAlign: "center" }}>
            <div style={{ color: "#568b05", marginBottom: "14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="30" height="30" style={{ margin: "0 auto", display: "block" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 10px" }}>
              {t.confirmTitle}
            </h3>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.7)", margin: 0 }}>
              {t.confirmBody}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

