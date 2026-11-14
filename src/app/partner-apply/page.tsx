"use client";

import React, { useState } from "react";
import Link from "next/link";
import { submitPartnerApplicationAction } from "@/app/actions/partnerApply";

export default function PartnerApplyPage() {
  const [lang, setLang] = useState<"en" | "es" | "fr">("en");
  const [type, setType] = useState<"community" | "workshop">("community");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Barcelona");
  const [description, setDescription] = useState("");
  const [memberCount, setMemberCount] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Optional legal/tax fields (§14 / CM-02)
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [hasInsurance, setHasInsurance] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const t = {
    en: {
      title: "Bring your community or workshop to The Mothers",
      subtitle: "Organise gatherings and workshops for mothers. Keep your community together with private spaces, simple RSVPs, and zero admin headache.",
      typeCommunity: "A mother community",
      typeCommunityDesc: "For neighbourhood groups, mother circles, and parenting clubs.",
      typeWorkshop: "A workshop, studio or brand",
      typeWorkshopDesc: "For specialists, movement teachers, wellness practitioners, and creative studios.",
      nameLabel: type === "community" ? "Community name" : "Workshop / Studio name",
      namePlaceholder: type === "community" ? "e.g. Mamás de Gràcia" : "e.g. Studio Bloom Postpartum Yoga",
      cityLabel: "City",
      descLabel: "Short description",
      descPlaceholder: "Tell us a little bit about what you do...",
      membersLabel: "Approximate community size / followers",
      contactNameLabel: "Contact person",
      contactEmailLabel: "Contact email",
      contactPhoneLabel: "Phone / WhatsApp",
      legalSectionTitle: "Legal & Business details",
      legalSectionNote: "Optional for now — many mother communities aren't registered businesses.",
      legalNameLabel: "Legal business name (if registered)",
      taxIdLabel: "Tax ID / NIF / CIF (if registered)",
      taxIdInvalid: "Please enter a valid Tax ID / NIF / CIF format (or leave empty).",
      insuranceLabel: "I have liability insurance covering public workshops (if you have it)",
      submitButton: isSubmitting ? "Submitting..." : "Send my application",
      successTitle: "Application submitted!",
      successDesc: "Thank you for bringing your project to The Mothers. Our team reviews every partner application carefully and will reach out within 1–2 business days.",
      backHome: "Return to home",
    },
    es: {
      title: "Trae tu comunidad o taller a The Mothers",
      subtitle: "Organiza encuentros y talleres para madres. Mantén tu comunidad unida con espacios dedicados, reservas sencillas y sin líos de gestión.",
      typeCommunity: "Una comunidad de madres",
      typeCommunityDesc: "Para grupos de barrio, círculos de madres y clubes de crianza.",
      typeWorkshop: "Un taller, estudio o marca",
      typeWorkshopDesc: "Para especialistas, profesoras de movimiento, bienestar y estudios creativos.",
      nameLabel: type === "community" ? "Nombre de la comunidad" : "Nombre del taller o estudio",
      namePlaceholder: type === "community" ? "ej. Mamás de Gràcia" : "ej. Studio Bloom Yoga Posparto",
      cityLabel: "Ciudad",
      descLabel: "Breve descripción",
      descPlaceholder: "Cuéntanos un poco sobre vuestra propuesta...",
      membersLabel: "Tamaño aproximado de la comunidad / seguidoras",
      contactNameLabel: "Persona de contacto",
      contactEmailLabel: "Correo electrónico de contacto",
      contactPhoneLabel: "Teléfono / WhatsApp",
      legalSectionTitle: "Datos fiscales y legales",
      legalSectionNote: "Opcional por ahora — muchas comunidades de madres no son empresas registradas.",
      legalNameLabel: "Razón social (si registrada)",
      taxIdLabel: "NIF / CIF (si registrada)",
      taxIdInvalid: "Por favor, introduce un formato de NIF/CIF válido (o déjalo vacío).",
      insuranceLabel: "Dispongo de seguro de responsabilidad civil para talleres públicos (si dispones de él)",
      submitButton: isSubmitting ? "Enviando..." : "Enviar mi solicitud",
      successTitle: "¡Solicitud enviada!",
      successDesc: "Gracias por traer tu proyecto a The Mothers. Nuestro equipo revisa cada propuesta con cariño y te contactará en 1-2 días laborables.",
      backHome: "Volver al inicio",
    },
    fr: {
      title: "Rejoignez The Mothers avec votre communauté ou vos ateliers",
      subtitle: "Organisez des rencontres et des ateliers pour les mamans. Fédérez votre communauté avec des espaces dédiés, des inscriptions fluides et sans tracas administratif.",
      typeCommunity: "Une communauté de mamans",
      typeCommunityDesc: "Pour les groupes de quartier, cercles de mamans et clubs de parentalité.",
      typeWorkshop: "Un atelier, studio ou marque",
      typeWorkshopDesc: "Pour spécialistes, enseignantes bien-être, post-partum et studios créatifs.",
      nameLabel: type === "community" ? "Nom de la communauté" : "Nom de l'atelier ou du studio",
      namePlaceholder: type === "community" ? "ex. Mamás de Gràcia" : "ex. Studio Bloom Yoga Postnatal",
      cityLabel: "Ville",
      descLabel: "Courte présentation",
      descPlaceholder: "Dites-nous en quelques mots ce que vous proposez...",
      membersLabel: "Nombre approximatif de membres / communauté",
      contactNameLabel: "Personne de contact",
      contactEmailLabel: "Email de contact",
      contactPhoneLabel: "Téléphone / WhatsApp",
      legalSectionTitle: "Informations légales & fiscales",
      legalSectionNote: "Facultatif pour l'instant — beaucoup de communautés de mamans ne sont pas des entreprises immatriculées.",
      legalNameLabel: "Raison sociale (si enregistré)",
      taxIdLabel: "Numéro fiscal / NIF / CIF (si enregistré)",
      taxIdInvalid: "Veuillez entrer un numéro fiscal / NIF / CIF valide (ou laisser vide).",
      insuranceLabel: "J'ai une assurance responsabilité civile couvrant les ateliers publics (si vous en avez une)",
      submitButton: isSubmitting ? "Envoi en cours..." : "Envoyer ma candidature",
      successTitle: "Candidature envoyée !",
      successDesc: "Merci de proposer votre projet à The Mothers. Notre équipe examine chaque candidature avec attention et vous répondra sous 1 à 2 jours ouvrés.",
      backHome: "Retour à l'accueil",
    },
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await submitPartnerApplicationAction({
        type,
        name,
        city,
        description,
        memberCount: memberCount ? parseInt(memberCount, 10) : undefined,
        contactName,
        contactEmail,
        contactPhone,
        legalName: legalName || undefined,
        taxId: taxId || undefined,
        hasInsurance,
      });

      if (!res.success) {
        if (res.error === "INVALID_TAX_ID") {
          setError(t.taxIdInvalid);
        } else {
          setError(res.error || "An error occurred while submitting.");
        }
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fbf8f5", padding: "40px 20px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* Language selector */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "20px" }}>
          {(["en", "es", "fr"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              style={{
                border: "none",
                background: lang === l ? "#7b1f2c" : "transparent",
                color: lang === l ? "#ffffff" : "rgba(57, 41, 42, 0.7)",
                padding: "4px 10px",
                borderRadius: "14px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {success ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "40px 32px",
              boxShadow: "0 4px 20px rgba(57, 41, 42, 0.08)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>✦</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", color: "#39292a", marginBottom: "12px" }}>
              {t.successTitle}
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.8)", marginBottom: "28px", maxWidth: "480px", margin: "0 auto 28px" }}>
              {t.successDesc}
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                backgroundColor: "#7b1f2c",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "24px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {t.backHome}
            </Link>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "36px 32px",
              boxShadow: "0 4px 20px rgba(57, 41, 42, 0.08)",
            }}
          >
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", color: "#39292a", margin: "0 0 10px 0" }}>
              {t.title}
            </h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", margin: "0 0 28px 0" }}>
              {t.subtitle}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              {/* Type Switcher */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "10px" }}>
                  {lang === "fr" ? "Type d'organisation" : lang === "es" ? "Tipo de organización" : "Organisation type"}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setType("community")}
                    style={{
                      border: type === "community" ? "2px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                      backgroundColor: type === "community" ? "rgba(123, 31, 44, 0.04)" : "#ffffff",
                      borderRadius: "8px",
                      padding: "14px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#39292a", marginBottom: "4px" }}>
                      {t.typeCommunity}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.65)", lineHeight: 1.4 }}>
                      {t.typeCommunityDesc}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("workshop")}
                    style={{
                      border: type === "workshop" ? "2px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                      backgroundColor: type === "workshop" ? "rgba(123, 31, 44, 0.04)" : "#ffffff",
                      borderRadius: "8px",
                      padding: "14px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#39292a", marginBottom: "4px" }}>
                      {t.typeWorkshop}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.65)", lineHeight: 1.4 }}>
                      {t.typeWorkshopDesc}
                    </div>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                  {t.nameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* City & Member Count */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                    {t.cityLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                    {t.membersLabel}
                  </label>
                  <input
                    type="number"
                    value={memberCount}
                    onChange={(e) => setMemberCount(e.target.value)}
                    placeholder="e.g. 150"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                  {t.descLabel}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descPlaceholder}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Contact Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                    {t.contactNameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Maria"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                    {t.contactPhoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                  {t.contactEmailLabel} *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Legal & Business section (Optional §14 / CM-02) */}
              <div
                style={{
                  borderTop: "1px solid rgba(57, 41, 42, 0.12)",
                  paddingTop: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#39292a" }}>{t.legalSectionTitle}</div>
                  <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.65)", marginTop: "2px" }}>
                    {t.legalSectionNote}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#39292a", marginBottom: "4px" }}>
                      {t.legalNameLabel}
                    </label>
                    <input
                      type="text"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. Gracia Mums S.L."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        border: "1px solid rgba(57, 41, 42, 0.25)",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#39292a", marginBottom: "4px" }}>
                      {t.taxIdLabel}
                    </label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="e.g. B12345678"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        border: error === t.taxIdInvalid ? "1.5px solid #a12c2c" : "1px solid rgba(57, 41, 42, 0.25)",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    checked={hasInsurance}
                    onChange={(e) => setHasInsurance(e.target.checked)}
                    style={{ marginTop: "3px", accentColor: "#7b1f2c" }}
                  />
                  <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.8)", lineHeight: 1.4 }}>
                    {t.insuranceLabel}
                  </span>
                </label>
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: "rgba(161, 44, 44, 0.08)",
                    border: "1px solid rgba(161, 44, 44, 0.3)",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    color: "#a12c2c",
                    fontSize: "13px",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#7b1f2c",
                  color: "#ffffff",
                  border: "none",
                  padding: "14px",
                  borderRadius: "24px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  marginTop: "8px",
                  transition: "background 0.15s ease",
                }}
              >
                {t.submitButton}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
