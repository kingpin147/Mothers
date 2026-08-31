"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

export default function LegalPage() {
  const [lang, setLang] = useState<Locale>("en");

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const isEn = lang === "en";

  const termsSections = isEn
    ? [
        { n: "00", title: "Who can join", body: "The Mothers is a private club for mothers. Membership, guest places and paid events are open to women who are mothers or who are expecting — pregnancy counts. Free walks and park socials are open to anyone on the same basis. If you tell us you are not a mother, we cannot offer you a place at an event, and you are welcome to join the Letter instead so we can write to you if that changes." },
        { n: "01", title: "Membership & the Membership Window", body: "Membership is by application. A Membership Window opens once a month and stays open for one week; in each Window we open a limited number of spots — the first 50 accepted members lock in the Opening Circle rate for twelve months. Outside a Window, applications join a waitlist and are reviewed at the next opening. Submitting an application does not guarantee acceptance; we review each application individually to keep the community safe and considered." },
        { n: "02", title: "Fees & billing", body: "Opening Circle members are billed €29/month or €79 every 3 months, fixed for twelve months from acceptance. After the Opening Circle period, the standard rate of €39/month or €99 every 3 months applies; we'll always notify you before a rate change takes effect. You choose your billing frequency when you apply, and payment is collected by card. You may cancel at any time with no cancellation fee — your membership ends at the close of the current billing period. You may pause your membership for up to two months per calendar year at no cost; your credit expiry clock pauses along with it. The Opening Circle rate depends on continuous membership: a pause preserves it, but on cancellation the Opening Circle rate ends with the membership, and any later rejoining is at the standard rate then in force." },
        { n: "03", title: "Credits", body: "Active members receive 20 credits each month to redeem against bookable experiences. Walks and park socials are always free and unlimited, and never draw from your credit balance. Unused credits roll over with no maximum balance, and each credit expires 6 months after it is issued — oldest credits are always used first, and we'll email you when a credit is within 30 days of expiring. Additional credits can be purchased at any time at a flat rate of €1 per credit, in the exact amount needed, and join your balance under the same rollover and expiry rules." },
        { n: "04", title: "Event Pass", body: "If you're not a member, you may attend any event other than a Signature moment with an Event Pass, €35 per event — walks and park socials remain free to everyone. Each person may purchase a maximum of two Event Passes in total, counted against the email address given at checkout. Each event has a set number of Event Pass places, two unless we state otherwise on the event itself, and guest places open fourteen days before the event and close two days before it, valid up to 18 credits. If you join The Mothers within thirty days of the event, your €35 is credited against your membership." },
        { n: "05", title: "Bookings, capacity & cancellations", body: "Every event has a fixed capacity, and bookings are confirmed in the order received. Members can cancel an upcoming booking directly from their account; any credit spent on that booking is returned in full when you cancel more than 24 hours before the start time. Inside 24 hours, the credit is returned only if the place is filled from the waitlist." },
        { n: "06", title: "Children & family safety", body: "Every event is labelled clearly as child-inclusive, offering on-site childcare, or adults-only, so you always know what to expect before you book. Unless an event explicitly provides childcare, parents and guardians remain responsible for supervising their own children throughout." },
        { n: "07", title: "Community standards", body: "The Mothers is a vetted, private space. We ask every member to treat other members, hosts and partners with respect, and to keep shared spaces safe for children. We reserve the right to suspend or remove any member whose conduct puts other members, children, or the community at risk." },
        { n: "08", title: "Partners & third-party services", body: "Partner discounts, classes and services listed on this website are provided by independent third parties. The Mothers curates and recommends these partners but is not responsible for the quality, safety, or delivery of services they provide directly." },
        { n: "09", title: "Intellectual property", body: "All text, photography, branding and design on this website belong to The Mothers or are used with permission. You may not reproduce or repurpose this content without our written consent." },
        { n: "10", title: "Limitation of liability", body: "The Mothers facilitates community, events and introductions in good faith, but participation in any event or activity is at your own discretion and risk." },
        { n: "11", title: "Changes to these Terms", body: "We may update these Terms from time to time as the club grows. We'll post any revision on this page with an updated date, and we'll email active members ahead of any change that materially affects their membership." },
        { n: "12", title: "Governing law", body: "These Terms are governed by the laws of Spain, and any dispute arising from them will be subject to the exclusive jurisdiction of the courts of Barcelona." },
        { n: "13", title: "Contact", body: "Questions about these Terms? Write to us at hello@themothers.cc." },
      ]
    : [
        { n: "00", title: "Quién puede unirse", body: "The Mothers es un club privado para madres. La membresía, los Event Pass y los eventos de pago están abiertos a mujeres que son madres o que están embarazadas — el embarazo cuenta. Los paseos y encuentros en el parque son abiertos a todas en las mismas condiciones." },
        { n: "01", title: "Membresía y la Ventana de membresía", body: "La membresía es por solicitud. Cada mes se abre una Ventana de membresía y permanece abierta una semana; en cada Ventana abrimos un número limitado de plazas — las primeras 50 socias aceptadas fijan la tarifa de Opening Circle durante doce meses." },
        { n: "02", title: "Tarifas y facturación", body: "Las socias del Opening Circle pagan 29€/mes o 79€ cada 3 meses, fijos durante doce meses desde la aceptación. Tras el periodo de Opening Circle, se aplica la tarifa estándar de 39€/mes o 99€ cada 3 meses. Puedes pausar tu membresía hasta dos meses por año natural sin coste." },
        { n: "03", title: "Créditos", body: "Las socias activas reciben 20 créditos cada mes para usar en experiencias reservables. Los paseos y encuentros en el parque son siempre gratuitos e ilimitados. Los créditos no usados se acumulan sin límite de saldo y caducan a los 6 meses (FIFO)." },
        { n: "04", title: "Event Pass", body: "Si no eres socia, puedes asistir a eventos de hasta 18 créditos con un Event Pass de 35€. Cada persona puede comprar un máximo de dos Event Pass en total. Si te unes en los 30 días posteriores, tus 35€ se descuentan de tu membresía." },
        { n: "05", title: "Reservas, aforo y cancelaciones", body: "Las reservas se pueden cancelar hasta 24 horas antes con devolución íntegra de créditos. Con menos de 24 horas, el crédito solo se devuelve si la plaza se cubre desde la lista de espera." },
        { n: "06", title: "Niños y seguridad familiar", body: "Cada evento está etiquetado con claridad como apto para niños, con cuidado infantil, o solo para adultas. Madres y tutores son responsables de supervisar a sus hijos en todo momento." },
        { n: "07", title: "Normas de la comunidad", body: "The Mothers es un espacio privado y verificado. Pedimos respeto y cuidado de los espacios compartidos." },
        { n: "08", title: "Partners y servicios de terceros", body: "Los descuentos y servicios de partners los prestan terceros independientes." },
        { n: "09", title: "Propiedad intelectual", body: "Todos los textos, fotografías y marca pertenecen a The Mothers o se usan con autorización." },
        { n: "10", title: "Limitación de responsabilidad", body: "La participación en cualquier actividad es bajo tu propia discreción y riesgo." },
        { n: "11", title: "Cambios en estos Términos", body: "Avisaremos por correo a las socias activas de cualquier cambio relevante en las condiciones." },
        { n: "12", title: "Ley aplicable", body: "Estos Términos se rigen por las leyes de España y los juzgados de Barcelona." },
        { n: "13", title: "Contacto", body: "¿Dudas sobre estos Términos? Escríbenos a hello@themothers.cc." },
      ];

  const privacySections = isEn
    ? [
        { n: "01", title: "Information we collect", body: "When you apply, we collect your name, contact details, motherhood stage, your children's ages, your neighbourhood, your goals for joining, your availability, your social handle and how you heard about us. Once you're a member, we hold your booking history, credit balance, and billing details — payment card data is captured and processed by our payment provider, not stored on our own systems." },
        { n: "01b", title: "Free walks and open events", body: "Our walks and park socials are free and open to everyone, including non-members. To reserve a slot we ask for your name, surname, email and a phone number — the phone number so we can send you the exact meeting point by WhatsApp, since we do not publish it." },
        { n: "02", title: "How we use your information", body: "We use your information to review applications, plan events for your stage and your neighbourhood, manage your bookings and credit balance, process payments, and send you service communications." },
        { n: "03", title: "Children's information", body: "We ask for your children's ages only to plan events for the right age groups and to label them appropriately — we don't collect your children's names, photographs, or other identifying details as part of an application." },
        { n: "04", title: "Legal basis for processing", body: "We process your application and membership data to perform our contract with you as a member, and with your consent where you've given it." },
        { n: "05", title: "Who we share it with", body: "We share the minimum necessary data with the tools that run the club: payment processing, email and scheduling providers. We do not sell your data." },
        { n: "06", title: "Data retention", body: "We keep your membership data for as long as you're a member, and for a limited period after you leave to meet our accounting and legal obligations." },
        { n: "07", title: "Data security", body: "We limit access to member data to the small team who need it to run the club, and we work with providers who meet current data-protection standards." },
        { n: "08", title: "Your rights", body: "Under the GDPR, you can ask to access, correct, delete, or receive a copy of your data, and you can object to or ask us to restrict certain uses of it. To exercise any of these rights, write to hello@themothers.cc." },
        { n: "09", title: "Cookies & local storage", body: "This website uses your browser's local storage to remember your language preference and, for members, to keep you signed in — we don't use third-party advertising or tracking cookies." },
        { n: "10", title: "Changes to this policy", body: "We may update this Privacy Policy as the club and its tools evolve. We'll post any change here with an updated date." },
        { n: "11", title: "Contact", body: "Questions about your data? Write to us at hello@themothers.cc." },
      ]
    : [
        { n: "01", title: "Información que recopilamos", body: "Cuando solicitas tu plaza, recopilamos tu nombre, datos de contacto, etapa de maternidad, edades de tus hijos, barrio y motivaciones. Una vez eres socia, guardamos tu historial de reservas, saldo y facturación. Los datos bancarios los procesa directamente nuestro proveedor seguro de pagos." },
        { n: "01b", title: "Paseos gratuitos y eventos abiertos", body: "Para reservar plaza en paseos abiertos pedimos nombre, apellido, correo y teléfono de WhatsApp para enviar el punto de encuentro exacto." },
        { n: "02", title: "Cómo usamos tu información", body: "Usamos tu información para gestionar tu membresía, organizar encuentros por etapa y barrio, gestionar créditos y comunicaciones de servicio." },
        { n: "03", title: "Información sobre tus hijos", body: "Pedimos la edad de tus hijos únicamente para planificar actividades por grupos de edad. No recopilamos nombres ni fotos de menores sin consentimiento expreso." },
        { n: "04", title: "Base legal del tratamiento", body: "Tratamos tus datos para ejecutar el contrato de membresía y conforme al consentimiento que nos has otorgado." },
        { n: "05", title: "Con quién compartimos tus datos", body: "Solo compartimos datos mínimos imprescindibles con proveedores técnicos (pagos, emails). Jamás vendemos tus datos." },
        { n: "06", title: "Conservación de los datos", body: "Conservamos los datos mientras dure la membresía y durante los plazos legalmente exigidos tras la baja." },
        { n: "07", title: "Seguridad de los datos", body: "Aplicamos medidas técnicas y organizativas rigurosas conforme a la normativa europea de protección de datos." },
        { n: "08", title: "Tus derechos", body: "Puedes acceder, rectificar o suprimir tus datos escribiendo a hello@themothers.cc o ante la Agencia Española de Protección de Datos (aepd.es)." },
        { n: "09", title: "Cookies y almacenamiento local", body: "Utilizamos almacenamiento local para recordar tu idioma y sesión. No usamos cookies publicitarias de terceros." },
        { n: "10", title: "Cambios en esta política", body: "Publicaremos cualquier actualización en esta página con la fecha correspondiente." },
        { n: "11", title: "Contacto", body: "¿Preguntas sobre privacidad? Escríbenos a hello@themothers.cc." },
      ];

  return (
    <div style={{ backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "var(--font-body)", minHeight: "100vh" }}>
      {/* Top Header */}
      <section style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(56px, 8vw, 88px) clamp(24px, 5vw, 64px) 4px" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "16px" }}>
          {isEn ? "LEGAL" : "LEGAL"}
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.1, margin: "0 0 16px" }}>
          {isEn ? "Terms & Privacy." : "Términos y Privacidad."}
        </h1>
        <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(57,41,42,0.65)", margin: 0, maxWidth: "56ch" }}>
          {isEn
            ? "Clear terms, careful data handling, and simple rules for a trusted room."
            : "Términos claros, tratamiento cuidadoso de los datos y normas sencillas para un espacio de confianza."}
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "22px" }}>
          <a
            href="#terms"
            style={{
              display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
              border: "1px solid #7b1f2c", color: "#7b1f2c", padding: "9px 18px",
              borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600,
              fontSize: "14px", textDecoration: "none",
            }}
          >
            {isEn ? "Terms & Conditions" : "Términos y Condiciones"}
          </a>
          <a
            href="#privacy"
            style={{
              display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
              border: "1px solid rgba(57,41,42,0.28)", color: "#39292a", padding: "9px 18px",
              borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600,
              fontSize: "14px", textDecoration: "none",
            }}
          >
            {isEn ? "Privacy Policy" : "Política de Privacidad"}
          </a>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS SECTION ─── */}
      <section id="terms" style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(40px, 6vw, 64px) clamp(24px, 5vw, 64px) 8px", scrollMarginTop: "100px" }}>
        <div style={{ borderTop: "2px solid rgba(57,41,42,0.5)", paddingTop: "26px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(27px, 3.4vw, 38px)", lineHeight: 1.15, margin: "0 0 10px" }}>
            {isEn ? "Terms & Conditions" : "Términos y Condiciones"}
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(57,41,42,0.5)", margin: "0 0 20px" }}>
            {isEn ? "Last updated 20 August 2026 · Barcelona, Spain" : "Última actualización: 20 de agosto de 2026 · Barcelona, España"}
          </p>
          <p style={{ fontSize: "15.5px", lineHeight: 1.75, color: "rgba(57,41,42,0.78)", margin: 0, maxWidth: "48em", textWrap: "pretty" }}>
            {isEn
              ? "These Terms & Conditions govern your use of the themothers.cc website and your membership with The Mothers, a private membership club for mothers operating in Barcelona, Spain. By submitting an application, booking a place as a guest, or otherwise using this website, you agree to be bound by these Terms. If you don't agree, please don't use the site or services."
              : "Estos Términos y Condiciones regulan el uso del sitio themothers.cc y tu membresía con The Mothers, un club privado de membresía para madres que opera en Barcelona, España. Al enviar una solicitud, reservar una plaza como invitada o utilizar este sitio web, aceptas quedar vinculada por estos Términos."}
          </p>
        </div>
      </section>

      <section style={{ maxWidth: "760px", margin: "0 auto", padding: "8px clamp(24px, 5vw, 64px) clamp(24px, 4vw, 40px)" }}>
        {termsSections.map((sec) => (
          <div key={sec.n} style={{ borderTop: "1px solid rgba(57,41,42,0.16)", padding: "30px 0" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "21px", margin: "0 0 12px", display: "flex", gap: "12px", alignItems: "baseline" }}>
              <span style={{ color: "rgba(123,31,44,0.4)", fontWeight: 400 }}>{sec.n}</span>
              <span>{sec.title}</span>
            </h3>
            <p style={{ fontSize: "15.5px", lineHeight: 1.75, color: "rgba(57,41,42,0.75)", margin: 0, maxWidth: "48em", textWrap: "pretty" }}>
              {sec.body}
            </p>
          </div>
        ))}
      </section>

      {/* ─── PRIVACY POLICY SECTION ─── */}
      <section id="privacy" style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(40px, 6vw, 64px) clamp(24px, 5vw, 64px) 8px", scrollMarginTop: "100px" }}>
        <div style={{ borderTop: "2px solid rgba(57,41,42,0.5)", paddingTop: "26px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(27px, 3.4vw, 38px)", lineHeight: 1.15, margin: "0 0 10px" }}>
            {isEn ? "Privacy Policy" : "Política de Privacidad"}
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(57,41,42,0.5)", margin: "0 0 20px" }}>
            {isEn ? "Last updated 20 August 2026 · Barcelona, Spain" : "Última actualización: 20 de agosto de 2026 · Barcelona, España"}
          </p>
          <p style={{ fontSize: "15.5px", lineHeight: 1.75, color: "rgba(57,41,42,0.78)", margin: 0, maxWidth: "48em", textWrap: "pretty" }}>
            {isEn
              ? "This Privacy Policy explains how The Mothers collects, uses and protects your personal data when you apply for membership, book events, or use themothers.cc. The Mothers is the data controller for the personal data described here, and can be reached at hello@themothers.cc for any privacy question."
              : "Esta Política de Privacidad explica cómo The Mothers recopila, utiliza y protege tus datos personales cuando solicitas tu membresía, reservas eventos o utilizas themothers.cc. The Mothers es la responsable del tratamiento de los datos personales descritos aquí."}
          </p>
        </div>
      </section>

      <section style={{ maxWidth: "760px", margin: "0 auto", padding: "8px clamp(24px, 5vw, 64px) clamp(32px, 5vw, 64px)" }}>
        {privacySections.map((sec) => (
          <div key={sec.n} style={{ borderTop: "1px solid rgba(57,41,42,0.16)", padding: "30px 0" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "21px", margin: "0 0 12px", display: "flex", gap: "12px", alignItems: "baseline" }}>
              <span style={{ color: "rgba(123,31,44,0.4)", fontWeight: 400 }}>{sec.n}</span>
              <span>{sec.title}</span>
            </h3>
            <p style={{ fontSize: "15.5px", lineHeight: 1.75, color: "rgba(57,41,42,0.75)", margin: 0, maxWidth: "48em", textWrap: "pretty" }}>
              {sec.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
