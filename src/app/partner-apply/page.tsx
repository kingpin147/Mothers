"use client";

import React, { useState } from "react";
import Link from "next/link";
import { submitPartnerApplicationAction } from "@/app/actions/partnerApply";

type PartnerKind = "community" | "workshop" | "service";
type BillingOption = "flat" | "commission";

export default function PartnerApplyPage() {
  const [lang, setLang] = useState<"en" | "es" | "fr">("en");
  const [kind, setKind] = useState<PartnerKind>("community");

  // Form values
  const [formData, setFormData] = useState<Record<string, string>>({
    name: "",
    contact: "",
    email: "",
    phone: "",
    web: "",
    type: "",
    where: "",
    price: "",
    offer: "",
    booking: "",
  });

  const [why, setWhy] = useState("");
  const [bill, setBill] = useState<BillingOption>("flat");
  const [legalName, setLegalName] = useState("");
  const [vat, setVat] = useState("");
  const [insured, setInsured] = useState(false);
  const [agree, setAgree] = useState(false);

  const [tried, setTried] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateField = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  // Translations & Copy matching Partner Apply.dc.html & Screenshots
  const titles = {
    community: {
      en: "Run your group's events on The Mothers.",
      es: "Organiza los eventos de tu grupo en The Mothers.",
      fr: "Organisez les événements de votre groupe sur The Mothers.",
    },
    workshop: {
      en: "Run your sessions on The Mothers.",
      es: "Organiza tus sesiones en The Mothers.",
      fr: "Organisez vos ateliers sur The Mothers.",
    },
    service: {
      en: "Offer your service to mothers on The Mothers.",
      es: "Ofrece tu servicio a madres en The Mothers.",
      fr: "Proposez vos services aux mères sur The Mothers.",
    },
  };

  const steps = {
    service: [
      {
        n: "1",
        t: lang === "fr" ? "Présentez votre service" : lang === "es" ? "Cuéntanos sobre tu servicio" : "You tell us about your service",
        d: lang === "fr" ? "Deux minutes, ci-dessous." : lang === "es" ? "Dos minutos, abajo." : "Two minutes, below.",
      },
      {
        n: "2",
        t: lang === "fr" ? "Nous validons ensemble" : lang === "es" ? "Lo revisamos" : "We check it",
        d: lang === "fr" ? "Avis, qualifications et un court échange." : lang === "es" ? "Reseñas, formación y una breve llamada." : "Reviews, training and a short call.",
      },
      {
        n: "3",
        t: lang === "fr" ? "Vous êtes référencée comme Partenaire" : lang === "es" ? "Apareces como Partner recomendada" : "You are listed as a Partner",
        d: lang === "fr" ? "Sur les professionnels recommandés, avec votre offre et votre code." : lang === "es" ? "En profesionales recomendadas, con tu oferta y tu propio código." : "On Recommended professionals, with your offer and your own code.",
      },
      {
        n: "4",
        t: lang === "fr" ? "Les mères réservent directement auprès de vous" : lang === "es" ? "Las madres te reservan directamente" : "Mothers book you directly",
        d: lang === "fr" ? "Via votre propre lien de réservation. Déclaration mensuelle des premières visites." : lang === "es" ? "A través de tu propio enlace. Declaras las primeras visitas mensualmente." : "Through your own booking link. You declare first visits monthly.",
      },
    ],
    workshop: [
      {
        n: "1",
        t: lang === "fr" ? "Présentez votre studio ou atelier" : lang === "es" ? "Cuéntanos sobre tu estudio o taller" : "You tell us about your studio",
        d: lang === "fr" ? "Deux minutes, ci-dessous." : lang === "es" ? "Dos minutos, abajo." : "Two minutes, below.",
      },
      {
        n: "2",
        t: lang === "fr" ? "Un court échange de cadrage" : lang === "es" ? "Una breve llamada" : "We have a short call",
        d: lang === "fr" ? "Pour faire connaissance et convenir de l'organisation." : lang === "es" ? "Para conocernos y acordar cómo gestionar las sesiones." : "To meet you and agree how you want to run things.",
      },
      {
        n: "3",
        t: lang === "fr" ? "Vous obtenez votre espace Communauté" : lang === "es" ? "Obtienes tu espacio de Comunidad" : "You get your Community space",
        d: lang === "fr" ? "Créez vos ateliers, suivez les inscrites, partagez votre lien." : lang === "es" ? "Crea eventos, mira quién asiste, comparte tu enlace de invitación." : "Create events, see who is coming, share your invite link.",
      },
      {
        n: "4",
        t: lang === "fr" ? "Les mères réservent sur The Mothers" : lang === "es" ? "Las madres reservan en The Mothers" : "Mothers book on The Mothers",
        d: lang === "fr" ? "Paiement sécurisé par carte à la réservation. 2 événements gratuits par mois inclus." : lang === "es" ? "Los eventos de pago se cobran con tarjeta al reservar. 2 eventos gratuitos al mes incluidos." : "Paid events are paid by card at booking. Free events: 2 a month included.",
      },
    ],
    community: [
      {
        n: "1",
        t: lang === "fr" ? "Présentez votre groupe" : lang === "es" ? "Cuéntanos sobre tu grupo" : "You tell us about your group",
        d: lang === "fr" ? "Deux minutes, ci-dessous." : lang === "es" ? "Dos minutos, abajo." : "Two minutes, below.",
      },
      {
        n: "2",
        t: lang === "fr" ? "Un court échange de cadrage" : lang === "es" ? "Una breve llamada" : "We have a short call",
        d: lang === "fr" ? "Pour faire connaissance et convenir de l'organisation." : lang === "es" ? "Para conocernos y acordar cómo gestionar los encuentros." : "To meet you and agree how you want to run things.",
      },
      {
        n: "3",
        t: lang === "fr" ? "Vous obtenez votre espace Communauté" : lang === "es" ? "Obtienes tu espacio de Comunidad" : "You get your Community space",
        d: lang === "fr" ? "Créez des rencontres, suivez les inscrites, partagez votre lien." : lang === "es" ? "Crea eventos, mira quién asiste, comparte tu enlace de invitación." : "Create events, see who is coming, share your invite link.",
      },
      {
        n: "4",
        t: lang === "fr" ? "Les mères réservent sur The Mothers" : lang === "es" ? "Las madres reservan en The Mothers" : "Mothers book on The Mothers",
        d: lang === "fr" ? "Paiement sécurisé par carte à la réservation. 2 événements gratuits par mois inclus." : lang === "es" ? "Los eventos de pago se cobran con tarjeta al reservar. 2 eventos gratuitos al mes incluidos." : "Paid events are paid by card at booking. Free events: 2 a month included.",
      },
    ],
  }[kind];

  const handleSend = async () => {
    setTried(true);
    setErrorMsg(null);

    // Validation
    if (!formData.name?.trim()) {
      setErrorMsg(kind === "community" ? "Community name is required." : "Business name is required.");
      return;
    }
    if (!formData.contact?.trim()) {
      setErrorMsg("Your name is required.");
      return;
    }
    if (!formData.email?.trim() || !formData.email.includes("@")) {
      setErrorMsg("A valid email address is required.");
      return;
    }
    if (kind !== "community" && !formData.web?.trim()) {
      setErrorMsg("Website or Instagram is required.");
      return;
    }
    if (kind === "service") {
      if (!formData.type?.trim()) {
        setErrorMsg("Your service description is required.");
        return;
      }
      if (!formData.where?.trim()) {
        setErrorMsg("Location is required.");
        return;
      }
      if (!formData.offer?.trim()) {
        setErrorMsg("Your offer for mothers is required.");
        return;
      }
    }
    if (kind !== "service" && !why.trim()) {
      setErrorMsg("Please let us know what events you would organise.");
      return;
    }
    if (!agree) {
      setErrorMsg("Please agree to the Terms and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);
    try {
      const serverKind = kind === "service" ? "one_to_one" : kind;
      const res = await submitPartnerApplicationAction({
        type: serverKind,
        name: formData.name.trim(),
        city: "Barcelona",
        description: why.trim() || formData.type.trim(),
        contactName: formData.contact.trim(),
        contactEmail: formData.email.trim(),
        contactPhone: formData.phone.trim(),
        serviceOffered: formData.type.trim() || undefined,
        usualPrice: formData.price.trim() || undefined,
        offerForMembers: formData.offer.trim() || undefined,
        bookingUrl: formData.booking.trim() || formData.web.trim() || undefined,
        billingModel: kind === "service" ? (bill === "flat" ? "monthly_19" : "commission_12") : undefined,
        legalName: legalName.trim() || undefined,
        taxId: vat.trim() || undefined,
        hasInsurance: insured,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit request. Please try again.");
      } else {
        setSent({ name: formData.name, contact: formData.contact });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* Top Header */}
      <header style={{ borderBottom: "1px solid rgba(57, 41, 42, 0.16)", background: "#fdf8f2" }}>
        <div
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            padding: "12px clamp(18px, 4vw, 36px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img src="/assets/logo-mark-alpha.png" alt="The Mothers" style={{ height: "46px", width: "auto", display: "block" }} />
            <span aria-hidden="true" style={{ width: "1px", height: "22px", background: "rgba(57, 41, 42, 0.28)" }} />
            <img src="/assets/logo-wordmark-alpha.png" alt="The Mothers" style={{ height: "13px", width: "auto", display: "block" }} />
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "18px", marginLeft: "auto" }}>
            {/* Language switcher */}
            <div
              role="group"
              aria-label="Language"
              style={{
                display: "flex",
                gap: "2px",
                border: "1px solid rgba(57, 41, 42, 0.22)",
                borderRadius: "16px",
                padding: "2px",
                fontSize: "12.5px",
              }}
            >
              {(["en", "es", "fr"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  style={{
                    border: "none",
                    borderRadius: "12px",
                    padding: "4px 9px",
                    cursor: "pointer",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "12px",
                    background: lang === l ? "#7b1f2c" : "transparent",
                    color: lang === l ? "#ffffff" : "#39292a",
                    fontWeight: lang === l ? 600 : 400,
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <Link
              href="/partner-portal"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15px",
                color: "#7b1f2c",
                textDecoration: "none",
              }}
            >
              {lang === "fr" ? "Déjà partenaire ? Se connecter" : lang === "es" ? "¿Ya aprobada? Iniciar sesión" : "Already approved? Sign in"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content: 2 Columns */}
      <main
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "clamp(32px, 5vw, 60px) clamp(18px, 4vw, 36px) 70px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: "clamp(28px, 4vw, 48px)",
          alignItems: "start",
        }}
      >
        {/* Left Column: Heading, description, and 4-step explanation */}
        <div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "12.5px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "10px",
            }}
          >
            {lang === "fr" ? "PROPOSEZ VOS ÉVÉNEMENTS AVEC NOUS" : lang === "es" ? "ORGANIZA TUS EVENTOS CON NOSOTRAS" : "RUN YOUR EVENTS WITH US"}
          </div>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.4vw, 46px)",
              lineHeight: 1.08,
              margin: "0 0 14px",
              color: "#39292a",
            }}
          >
            {titles[kind][lang]}
          </h1>

          <p style={{ fontSize: "15px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.78)", margin: "0 0 24px", maxWidth: "46ch" }}>
            {lang === "fr"
              ? "Pour les communautés de mères, studios, ateliers et services individuels. Présentez-vous — nous répondons sous 2 jours ouvrés."
              : lang === "es"
              ? "Para comunidades de madres, estudios y talleres, y servicios individuales. Cuéntanos sobre ti — respondemos en 2 días laborables."
              : "For mother communities, studios and workshops, and one-to-one services. Tell us about you — we reply within two working days."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(57, 41, 42, 0.14)" }}>
            {steps.map((s) => (
              <div
                key={s.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px minmax(0, 1fr)",
                  gap: "4px 12px",
                  padding: "16px 0",
                  borderBottom: "1px solid rgba(57, 41, 42, 0.14)",
                }}
              >
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", lineHeight: 1, color: "#7b1f2c" }}>
                  {s.n}
                </span>
                <div style={{ fontSize: "14px", lineHeight: 1.55 }}>
                  <strong style={{ fontWeight: 600, color: "#39292a" }}>{s.t}</strong>
                  <div style={{ color: "rgba(57, 41, 42, 0.72)", marginTop: "2px" }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive Form Box */}
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.18)",
            borderRadius: "8px",
            background: "#ffffff",
            padding: "clamp(22px, 3vw, 32px)",
            boxShadow: "0 4px 20px rgba(57, 41, 42, 0.04)",
          }}
        >
          {sent ? (
            <div>
              <div style={{ fontSize: "36px", color: "#3b5e04", marginBottom: "12px" }}>✓</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "26px", margin: "0 0 8px" }}>
                {lang === "fr" ? `Merci, ${sent.contact}` : lang === "es" ? `Gracias, ${sent.contact}` : `Thank you, ${sent.contact}.`}
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.78)", margin: "0 0 20px" }}>
                {lang === "fr"
                  ? `Nous avons bien reçu votre demande pour ${sent.name}. Notre équipe vous répond par e-mail sous deux jours ouvrés. Une fois validée, vous accéderez à votre espace avec cet e-mail.`
                  : lang === "es"
                  ? `Hemos recibido tu solicitud para ${sent.name}. Respondemos por correo en dos días laborables. Una vez aprobada, podrás acceder a tu espacio con este correo.`
                  : `We have your request for ${sent.name}. We reply by email within two working days. Once approved, you sign in to your Community space with this email.`}
              </p>
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  padding: "8px 18px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                }}
              >
                {lang === "fr" ? "Retour à l'accueil" : lang === "es" ? "Volver al inicio" : "Back to The Mothers"}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "24px", margin: "0 0 4px", color: "#39292a" }}>
                {lang === "fr" ? "Parlez-nous de vous" : lang === "es" ? "Cuéntanos sobre ti" : "Tell us about you"}
              </h2>

              {/* 3 Clickable Type Cards */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#39292a", marginBottom: "8px" }}>
                  {lang === "fr" ? "Vous êtes *" : lang === "es" ? "Eres *" : "You are *"}
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    {
                      key: "community",
                      label: lang === "fr" ? "Une communauté de mères" : lang === "es" ? "Una comunidad de madres" : "A mother community",
                      sub: lang === "fr" ? "Groupe WhatsApp, cercle, association" : lang === "es" ? "Grupo de WhatsApp, círculo, asociación" : "WhatsApp group, circle, association",
                    },
                    {
                      key: "workshop",
                      label: lang === "fr" ? "Un atelier, studio ou marque" : lang === "es" ? "Un taller, estudio o marca" : "A workshop, studio or brand",
                      sub: lang === "fr" ? "Cours collectifs, sessions, expériences" : lang === "es" ? "Clases grupales, sesiones, experiencias" : "Group classes, sessions, experiences",
                    },
                    {
                      key: "service",
                      label: lang === "fr" ? "Un service individuel" : lang === "es" ? "Un servicio individual" : "A one-to-one service",
                      sub: lang === "fr" ? "Soins, massage, coiffure, coaching — une mère à la fois" : lang === "es" ? "Faciales, masaje, pelo, coaching — una madre a la vez" : "Facials, massage, hair, coaching — one mother at a time",
                    },
                  ].map((item) => {
                    const isSelected = kind === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setKind(item.key as PartnerKind)}
                        style={{
                          textAlign: "left",
                          border: isSelected ? "1.5px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.22)",
                          background: isSelected ? "rgba(123, 31, 44, 0.04)" : "#ffffff",
                          borderRadius: "6px",
                          padding: "10px 14px",
                          cursor: "pointer",
                          transition: "border-color 0.15s ease",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#39292a" }}>
                          {item.label}
                        </strong>
                        <span style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)" }}>{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Field 1: Name */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  {kind === "community" ? "Community name *" : "Business name *"}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder={kind === "community" ? "Mamás de Gràcia" : kind === "workshop" ? "Studio Luz" : "Glow Skin Studio"}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                />
              </div>

              {/* Your Name & Email */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Your name *</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="First and last name"
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder={kind === "community" ? "you@email.com" : "you@studio.com"}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+34"
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                />
              </div>

              {/* Web / Instagram Link */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  {kind === "community" ? "Instagram or group link" : "Website or Instagram *"}
                </label>
                <input
                  type="text"
                  value={formData.web}
                  onChange={(e) => updateField("web", e.target.value)}
                  placeholder={kind === "community" ? "instagram.com/…" : kind === "workshop" ? "studioluz.com" : "glowskin.es"}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                />
              </div>

              {/* Kind-specific fields */}
              {kind === "community" && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    How many mothers are in your group?
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => updateField("type", e.target.value)}
                    placeholder="e.g. WhatsApp group · 80 mothers"
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                  />
                </div>
              )}

              {kind === "workshop" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      What do you offer?
                    </label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      placeholder="e.g. postnatal yoga, baby massage, sleep workshops"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Where do you run your sessions?
                    </label>
                    <input
                      type="text"
                      value={formData.where}
                      onChange={(e) => updateField("where", e.target.value)}
                      placeholder="Your studio address, or “at venues”"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                </>
              )}

              {kind === "service" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Your service *
                    </label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      placeholder="e.g. facial, postnatal massage, hair at home"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Usual price and length
                    </label>
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => updateField("price", e.target.value)}
                      placeholder="e.g. €60 · 60 min"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Where? *
                    </label>
                    <input
                      type="text"
                      value={formData.where}
                      onChange={(e) => updateField("where", e.target.value)}
                      placeholder="Your studio address, or “at her home”"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Your offer for mothers *
                    </label>
                    <input
                      type="text"
                      value={formData.offer}
                      onChange={(e) => updateField("offer", e.target.value)}
                      placeholder="e.g. 15% off the first visit"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      How mothers book you
                    </label>
                    <input
                      type="text"
                      value={formData.booking}
                      onChange={(e) => updateField("booking", e.target.value)}
                      placeholder="Booking link, WhatsApp or phone"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                </>
              )}

              {/* Why / What would you organise */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  {kind === "workshop"
                    ? "Which events would you run with us? *"
                    : kind === "service"
                    ? "Tell us about you (optional)"
                    : "What would you organise with us? *"}
                </label>
                <textarea
                  rows={4}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder={
                    kind === "workshop"
                      ? "e.g. a monthly baby-massage class, €25, 8 places"
                      : kind === "service"
                      ? "Your training, how long you have practised, anything mothers should know"
                      : "Weekly coffees, a paid workshop each month…"
                  }
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif", resize: "vertical" }}
                />
              </div>

              {/* Service Payment Preference (Only for one-to-one services) */}
              {kind === "service" && (
                <div style={{ borderTop: "1px solid rgba(57, 41, 42, 0.12)", paddingTop: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                    How would you like to pay us? *
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                    {[
                      {
                        key: "flat",
                        label: "Flat · €19 a month",
                        sub: "Simple: one monthly fee, cancel any time.",
                      },
                      {
                        key: "commission",
                        label: "Commission · 12% of each first visit",
                        sub: "You declare first visits from The Mothers each month.",
                      },
                    ].map((b) => {
                      const isSel = bill === b.key;
                      return (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() => setBill(b.key as BillingOption)}
                          style={{
                            textAlign: "left",
                            border: isSel ? "1.5px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.25)",
                            background: isSel ? "rgba(123, 31, 44, 0.05)" : "#ffffff",
                            borderRadius: "6px",
                            padding: "10px 12px",
                            cursor: "pointer",
                          }}
                        >
                          <strong style={{ fontWeight: 600, fontSize: "14px", color: "#39292a" }}>{b.label}</strong>
                          <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.7)", marginTop: "2px" }}>{b.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Legal / Tax Details for Workshops */}
              {kind === "workshop" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid rgba(57, 41, 42, 0.12)", paddingTop: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Legal name <span style={{ fontWeight: 400, color: "rgba(57, 41, 42, 0.6)" }}>(if registered)</span>
                    </label>
                    <input
                      type="text"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="Business or autónoma name"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Tax ID — NIF / CIF <span style={{ fontWeight: 400, color: "rgba(57, 41, 42, 0.6)" }}>(if registered)</span>
                    </label>
                    <input
                      type="text"
                      value={vat}
                      onChange={(e) => setVat(e.target.value)}
                      placeholder="B12345678"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "'Lora', Georgia, serif" }}
                    />
                  </div>
                  <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", lineHeight: 1.5, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={insured}
                      onChange={(e) => setInsured(e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "#7b1f2c", marginTop: "2px" }}
                    />
                    <span>I have liability insurance for the activities I will run (if you have it).</span>
                  </label>
                </div>
              )}

              {/* Terms and Agreements Checkbox */}
              <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", lineHeight: 1.5, cursor: "pointer", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#7b1f2c", marginTop: "2px" }}
                />
                <span>
                  I agree to the <Link href="/terms" style={{ color: "#7b1f2c" }}>Terms</Link> and <Link href="/privacy" style={{ color: "#7b1f2c" }}>Privacy Policy</Link>.{" "}
                  {kind === "service" ? (
                    "You are listed on Recommended professionals as a Partner, with your offer and a code. You pay either €19 a month, or 12% of the first visit of each mother who comes through The Mothers, declared monthly. Doctors and psychologists can only be listed free."
                  ) : (
                    `Paid events carry a ${kind === "workshop" ? "20%" : "15%"} commission (at least €1 per mother). Free events: 2 a month included, then €1 per mother who comes.`
                  )}
                </span>
              </label>

              {/* Error message */}
              {errorMsg && (
                <div style={{ fontSize: "13px", color: "#993842" }}>{errorMsg}</div>
              )}

              {/* Submit button: NO PAYMENT AT SIGNUP */}
              <button
                type="button"
                onClick={handleSend}
                disabled={isSubmitting}
                style={{
                  border: "1px solid #7b1f2c",
                  background: "#7b1f2c",
                  color: "#ffffff",
                  borderRadius: "4px",
                  padding: "12px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "16.5px",
                  cursor: isSubmitting ? "default" : "pointer",
                  marginTop: "6px",
                  transition: "background 0.15s ease",
                }}
              >
                {isSubmitting ? "Sending..." : "Send request"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
