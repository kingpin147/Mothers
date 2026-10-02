"use client";

import React from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function PrivacyPage() {
  const { language: lang } = useLanguage();
  const isEn = lang === "en";

  const privacyData = {
    title: isEn ? "Privacy Policy" : "Política de Privacidad",
    meta: isEn ? "Last updated 27 September 2026 · Barcelona, Spain" : "Última actualización: 27 de septiembre de 2026 · Barcelona, España",
    intro: isEn
      ? "This Privacy Policy explains how The Mothers collects, uses and protects your personal data when you open an account, book an event, buy credits or use themothers.cc. The Mothers is the data controller for the personal data described here, and can be reached at hello@themothers.cc for any privacy question."
      : "Esta Política de Privacidad explica cómo The Mothers recopila, utiliza y protege tus datos personales al crear una cuenta, reservar eventos, comprar créditos o utilizar themothers.cc. The Mothers es el responsable del tratamiento de los datos personales y está disponible en hello@themothers.cc para cualquier duda.",
    sections: isEn
      ? [
          {
            n: "01",
            title: "What we collect",
            body: "When you open an account we record your name, email address and phone number. When you book an event we record which event, when, and what it cost in credits; we also ask for a phone number so we can send the exact meeting point, which we do not publish. When you buy credits, the card details are captured and processed by our payment provider and are not stored on our systems — we keep the amount, the date and the receipt. If you write to us, we keep that correspondence. If you use La Gazette we keep your posts, replies, photos and any reports you make; posts shown anonymously are still linked to your account. If you host or invite friends we keep your host requests, attendance and no-show records, your Godmother code and who registered with it.",
          },
          {
            n: "02",
            title: "How we use it",
            body: "To run your account and wallet, to confirm and manage your bookings, to send the practical emails an event needs — confirmations, meeting points, changes, and the reminder before credits expire — and, if you asked for it, the monthly letter. We will write to you before membership opens to tell you membership is opening; you can decline that at any time. We never use your data to sell to you on behalf of a partner without your direct request.",
          },
          {
            n: "03",
            title: "Children's information",
            body: "Where we ask about your children, it is only to plan events for the right age groups and to label them correctly. We do not collect children's names or other identifying details. A photo posted in La Gazette that shows a child requires the poster to confirm she is the parent or has the parent's permission. Where an event involves photography, we ask separately and clearly for your consent.",
          },
          {
            n: "04",
            title: "Legal basis",
            body: "We process account and booking data to perform our contract with you, and with your consent where you have given it — for instance the monthly letter, which you can leave at any time. Where relevant we rely on our legitimate interest in keeping the community safe and considered, balanced against your rights.",
          },
          {
            n: "05",
            title: "Who we share it with",
            body: "The minimum necessary data goes to the tools that run the club: payment processing (Stripe), email (Brevo) and hosting of the site. Hosts and partners receive only the attendance list for the event they are running. We do not sell your data and do not pass your details to a partner business unless you have asked to be referred. Some tools are based outside the EU; where that is the case we rely on standard contractual safeguards.",
          },
          {
            n: "06",
            title: "Retention",
            body: "We keep your account and booking data for as long as your account is open, and for a limited period after it closes to meet accounting and legal obligations. Newsletter records are kept until you unsubscribe. If you ask us to delete your account, your personal data is removed, your La Gazette posts stay without your name, and payment records are kept only as long as tax law requires.",
          },
          {
            n: "07",
            title: "Security",
            body: "Access to account data is limited to the small team who need it to run the club, and we work with providers who meet current data-protection standards. No system is completely immune to risk, but we take reasonable technical and organisational measures to protect your data against loss or misuse.",
          },
          {
            n: "08",
            title: "Your rights",
            body: "Under the GDPR you can ask to access, correct, delete or receive a copy of your data, and you can object to or restrict certain uses of it. Write to hello@themothers.cc. If you are not satisfied with our response you can lodge a complaint with the Spanish data protection authority (Agencia Española de Protección de Datos, aepd.es).",
          },
          {
            n: "09",
            title: "Cookies and local storage",
            body: "This website uses your browser's local storage to keep you signed in and to remember your wallet and bookings. We do not use third-party advertising or tracking cookies. Analytics cookies are only set if you accept them in the cookie banner; you can change your choice at any time from the “Cookie settings” link in the footer.",
          },
          {
            n: "10",
            title: "Changes",
            body: "We may update this policy as the club and its tools evolve. Any change is posted here with an updated date, and we email account holders about any change that materially affects how we handle their data.",
          },
        ]
      : [
          {
            n: "01",
            title: "Qué recopilamos",
            body: "Al crear una cuenta recopilamos tu nombre, correo electrónico y teléfono. Al reservar un evento registramos los datos del mismo y su coste en créditos; también solicitamos tu teléfono para enviar la ubicación exacta de encuentro, la cual no publicamos. Para la compra de créditos, los datos de tarjeta son procesados por Stripe. Si participas en La Gazette se guardan tus mensajes y fotos; las publicaciones anónimas siguen vinculadas internamente a tu cuenta.",
          },
          {
            n: "02",
            title: "Cómo lo usamos",
            body: "Para gestionar tu cuenta y monedero, confirmar reservas, enviar avisos y puntos de encuentro, y avisar 30 días antes de la caducidad de créditos. Te informaremos puntualmente antes de la apertura de la membresía.",
          },
          {
            n: "03",
            title: "Información sobre menores",
            body: "Las preguntas sobre etapas familiares sirven exclusivamente para planificar eventos adaptados. No recopilamos nombres de menores ni datos sensibles. Las fotos en La Gazette que incluyan menores requieren confirmación de tutela parental o autorización explícita.",
          },
          {
            n: "04",
            title: "Base legal",
            body: "Tratamos los datos para la ejecución del servicio y bajo tu consentimiento previo, así como en base al interés legítimo de mantener una comunidad segura.",
          },
          {
            n: "05",
            title: "Con quién lo compartimos",
            body: "Solo con los proveedores indispensables para el funcionamiento del club: pasarela de pago (Stripe), envíos transaccionales (Brevo) e infraestructura de alojamiento web. No vendemos ni cedemos datos a terceros sin tu solicitud expresa.",
          },
          {
            n: "06",
            title: "Conservación",
            body: "Conservamos los datos mientras tu cuenta permanezca activa y durante los plazos legalmente exigidos. Si solicitas la supresión de tu cuenta, tus datos personales se eliminan y tus aportaciones en La Gazette quedan anonimizadas.",
          },
          {
            n: "07",
            title: "Seguridad",
            body: "Aplicamos medidas técnicas y organizativas rigurosas para proteger tus datos contra cualquier acceso no autorizado o pérdida.",
          },
          {
            n: "08",
            title: "Tus derechos",
            body: "Conforme al RGPD puedes ejercer tus derechos de acceso, rectificación, supresión y portabilidad escribiendo a hello@themothers.cc o acudiendo a la AEPD.",
          },
          {
            n: "09",
            title: "Cookies y almacenamiento local",
            body: "Utilizamos almacenamiento local para mantener tu sesión activa y recordar tu idioma y preferencias. Las cookies analíticas solo se activan con tu consentimiento y puedes modificarlas en 'Preferencias de cookies' en el pie de página.",
          },
          {
            n: "10",
            title: "Cambios en esta política",
            body: "Cualquier modificación de esta política se publicará aquí con la fecha correspondiente y se notificará por correo a las usuarias con cuenta.",
          },
        ],
  };

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", minHeight: "100vh" }}>
      {/* ─── Header Section ─── */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(36px, 5vw, 62px) clamp(20px, 5vw, 64px) clamp(16px, 2vw, 24px)" }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "12px",
          }}
        >
          Legal
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(30px, 4.2vw, 48px)",
            lineHeight: 1.1,
            margin: "0 0 10px",
          }}
        >
          {privacyData.title}
        </h1>
        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.58)", margin: "0 0 22px" }}>
          {privacyData.meta}
        </p>

        <p style={{ fontSize: "16px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.74)", margin: 0, textAlign: "justify" }}>
          {privacyData.intro}
        </p>
      </section>

      {/* ─── Document Sections ─── */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(16px, 2vw, 24px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)" }}>
        {privacyData.sections.map((s) => (
          <div
            key={s.n}
            style={{
              display: "flex",
              gap: "clamp(14px, 2vw, 26px)",
              borderTop: "1px solid rgba(57, 41, 42, 0.14)",
              padding: "22px 0",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "20px",
                color: "rgba(123, 31, 44, 0.4)",
                fontFeatureSettings: "'tnum'",
                flex: "none",
                width: "34px",
              }}
            >
              {s.n}
            </div>
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "20px",
                  margin: "0 0 8px",
                  color: "#39292a",
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: 1.72,
                  color: "rgba(57, 41, 42, 0.74)",
                  margin: 0,
                  textAlign: "justify",
                }}
              >
                {s.body}
              </p>
            </div>
          </div>
        ))}

        <p
          style={{
            fontSize: "13.5px",
            color: "rgba(57, 41, 42, 0.58)",
            borderTop: "1px solid rgba(57, 41, 42, 0.14)",
            paddingTop: "20px",
            margin: "20px 0 0",
          }}
        >
          {isEn ? "Questions? Write to " : "¿Dudas? Escríbenos a "}
          <a href="mailto:hello@themothers.cc" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            hello@themothers.cc
          </a>
          .
        </p>
      </section>
    </div>
  );
}
