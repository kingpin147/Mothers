"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function PrivacyPage() {
  const { language: lang } = useLanguage();

  const privacyData = {
    title: lang === "fr" ? "Politique de Confidentialité" : lang === "es" ? "Política de Privacidad" : "Privacy Policy",
    meta:
      lang === "fr"
        ? "Dernière mise à jour le 21 novembre 2026 · Barcelone, Espagne"
        : lang === "es"
        ? "Última actualización: 21 de noviembre de 2026 · Barcelona, España"
        : "Last updated 21 November 2026 · Barcelona, Spain",
    convenienceNote:
      lang === "fr"
        ? "Traduction fournie à titre indicatif. En cas de divergence, la version anglaise prévaut."
        : lang === "es"
        ? "Traducción facilitada por comodidad. En caso de discrepancia, prevalece la versión en inglés."
        : "",
    intro:
      lang === "fr"
        ? "Cette Politique de Confidentialité explique comment The Mothers collecte, utilise et protège vos données personnelles lorsque vous ouvrez un compte, réservez un événement, achetez des crédits ou utilisez themothers.cc. The Mothers est le responsable du traitement des données personnelles décrites ici et peut être contacté à hello@themothers.cc pour toute question relative à votre vie privée."
        : lang === "es"
        ? "Esta Política de Privacidad explica cómo The Mothers recopila, utiliza y protege tus datos personales al crear una cuenta, reservar eventos, comprar créditos o utilizar themothers.cc. The Mothers es el responsable del tratamiento de los datos personales y está disponible en hello@themothers.cc para cualquier duda sobre privacidad."
        : "This Privacy Policy explains how The Mothers collects, uses and protects your personal data when you open an account, book an event, buy credits or use themothers.cc. The Mothers is the data controller for the personal data described here, and can be reached at hello@themothers.cc for any privacy question.",
    sections: [
      {
        n: "01",
        title: lang === "fr" ? "Ce que nous collectons" : lang === "es" ? "Qué recopilamos" : "What we collect",
        body:
          lang === "fr"
            ? "Lorsque vous ouvrez un compte — seul ou lors de votre première réservation — nous conservons votre nom, adresse email et numéro de téléphone, ainsi que vos réponses au questionnaire d'accueil (étape, quartier, centres d'intérêt). Lorsque vous réservez, nous enregistrons quel événement, quand et ce qu'il a coûté. Lorsque vous payez, les coordonnées bancaires sont saisies et traitées par notre prestataire de paiement sécurisé et ne sont pas stockées sur nos serveurs — nous ne conservons que le montant, la date et le reçu. Si vous utilisez Le Forum, nous conservons vos publications, réponses, photos, messages enregistrés, abonnements et signalements ; les publications affichées anonymement restent rattachées à votre compte. Nous conservons vos messages privés, blocages et signalements, vos avis sur les professionnels, vos propositions de rencontres, vos demandes d'hôte, vos historiques de présence et d'absence non signalée, votre code Marraine et les personnes inscrites avec celui-ci, ainsi que les copies de code Partenaire ou clics sur les liens Partenaires."
            : lang === "es"
            ? "Al abrir una cuenta —por sí sola o con tu primera reserva— guardamos tu nombre, correo y número de teléfono, así como tus respuestas al cuestionario de bienvenida (etapa, barrio, intereses). Al reservar registramos el evento, la fecha y el importe abonado. Al pagar, los datos de la tarjeta son gestionados directamente por nuestra pasarela de pago segura y no se almacenan en nuestros servidores: conservamos el importe, la fecha y el recibo. Si usas El Foro conservamos tus publicaciones, respuestas, fotos, guardados, seguidos y denuncias; las publicaciones anónimas siguen vinculadas a tu cuenta. Guardamos tus mensajes privados, bloqueos y reportes, tus reseñas de profesionales, tus propuestas de encuentros, solicitudes de anfitriona, asistencias y no-shows, tu código de Madrina y quién se registró con él, así como el copiado de códigos de Partner o accesos a sus enlaces."
            : "When you open an account — on its own or with your first booking — we keep your name, email address and phone number, and your answers to the welcome questions (stage, neighbourhood, interests). When you book we record which event, when, and what it cost. When you pay, card details are captured and processed by our payment provider and are not stored on our systems — we keep the amount, the date and the receipt. If you use The Forum we keep your posts, replies, photos, saved posts, follows and reports; posts shown anonymously are still linked to your account. We keep your private messages, blocks and reports, your reviews of professionals, your gatherings, host requests, attendance and no-show records, your Godmother code and who registered with it, and when you copy a Partner code or open a Partner link.",
      },
      {
        n: "02",
        title: lang === "fr" ? "Comment nous l'utilisons" : lang === "es" ? "Cómo lo usamos" : "How we use it",
        body:
          lang === "fr"
            ? "Pour faire fonctionner votre compte et votre portefeuille, pour confirmer et gérer vos réservations et rencontres, pour envoyer les emails pratiques nécessaires — confirmations, points de rendez-vous, changements, rappels, nouveaux messages et réponses aux sujets suivis (tous deux désactivables dans Mon Compte), et le rappel avant expiration des crédits — et, si vous l'avez demandé, la lettre mensuelle. Si l'adhésion s'ouvre, nous vous écrirons une fois pour vous en informer. Les copies de codes Partenaires et clics sur les liens sont comptabilisés pour facturer les Partenaires ; nous ne vendons jamais rien pour le compte d'un partenaire sans votre demande expresse."
            : lang === "es"
            ? "Para gestionar tu cuenta y monedero, confirmar y administrar tus reservas y encuentros, enviar los emails necesarios —confirmaciones, puntos de encuentro, modificaciones, recordatorios, nuevos mensajes privados y respuestas seguidas (ambos configurables en Mi Cuenta), así como el aviso antes de que caduquen tus créditos— y, si la solicitaste, la carta mensual. Si se abre la membresía, te escribiremos una vez para informarte. El recuento de códigos y enlaces de Partners sirve para su facturación; nunca comercializamos en nombre de un partner sin tu solicitud previa."
            : "To run your account and wallet, to confirm and manage your bookings and gatherings, to send the practical emails they need — confirmations, meeting points, changes, reminders, new messages and replies you follow (both can be turned off in My Account), and the reminder before credits expire — and, if you asked for it, the monthly letter. If membership opens, we will write to you once to tell you. Partner code copies and link clicks are counted so we can invoice Partners; we never sell to you on behalf of a partner without your request.",
      },
      {
        n: "03",
        title: lang === "fr" ? "Informations relatives aux enfants" : lang === "es" ? "Información sobre menores" : "Children’s information",
        body:
          lang === "fr"
            ? "Lorsque nous vous interrogeons sur vos enfants, c'est uniquement pour concevoir des événements adaptés aux bonnes tranches d'âge. Nous ne collectons pas les prénoms des enfants ni aucun autre détail d'identification. Toute photo publiée sur Le Forum ou utilisée sur notre page d'accueil montrant un enfant nécessite l'accord formel du parent."
            : lang === "es"
            ? "Las preguntas sobre tus hijos sirven únicamente para planificar eventos adaptados a sus franjas de edad. No recopilamos nombres de menores ni datos identificativos personales. Cualquier fotografía compartida en El Foro o en la portada que muestre a un menor requiere la autorización expresa de sus progenitores."
            : "Where we ask about your children, it is only to plan events for the right age groups. We do not collect children’s names or other identifying details. A photo posted in The Forum or used on our homepage that shows a child requires the parent’s permission.",
      },
      {
        n: "04",
        title: lang === "fr" ? "Base légale" : lang === "es" ? "Base legal" : "Legal basis",
        body:
          lang === "fr"
            ? "Nous traitons les données de compte et de réservation pour exécuter notre contrat avec vous, et sur la base de votre consentement lorsque vous l'avez formulé — par exemple pour la lettre mensuelle, dont vous pouvez vous désinscrire à tout moment. Nous nous appuyons sur notre intérêt légitime à préserver la sécurité de la communauté, mis en balance avec vos droits."
            : lang === "es"
            ? "Tratamos los datos de cuenta y reserva para la ejecución de la relación contractual contigo, y bajo tu consentimiento cuando lo hayas otorgado (como en la carta mensual, cancelable en cualquier momento). Nos basamos asimismo en nuestro interés legítimo de mantener la comunidad segura y protegida, ponderado frente a tus derechos."
            : "We process account and booking data to perform our contract with you, and with your consent where you have given it — for instance the monthly letter, which you can leave at any time. We rely on our legitimate interest in keeping the community safe, balanced against your rights.",
      },
      {
        n: "05",
        title: lang === "fr" ? "Qui voit quoi" : lang === "es" ? "Quién ve qué" : "Who sees what",
        body:
          lang === "fr"
            ? "Les autres mères voient votre prénom, votre quartier et vos publications sur Le Forum (ou « Une mère » lorsque vous publiez anonymement), vos avis publics et les messages que vous leur adressez. Les organisateurs d'un événement ou d'une rencontre que vous réservez — communautés, studios, hôtes et mères — voient votre prénom et votre étape de maternité uniquement ; votre email et votre téléphone restent exclusivement auprès de The Mothers. Les avis « Pas pour moi » et les messages signalés ne sont visibles que par notre équipe. Notre équipe ne lit une conversation privée que si elle fait l'objet d'un signalement."
            : lang === "es"
            ? "Las demás madres ven tu nombre de pila, tu barrio y tus publicaciones en El Foro (o «Una madre» si publicas en modo anónimo), tus reseñas públicas y los mensajes que les envíes. Los organizadores de un evento o encuentro que reserves —comunidades, estudios, anfitrionas y madres— únicamente ven tu nombre y tu etapa de maternidad; tu correo y teléfono permanecen bajo la custodia de The Mothers. Las respuestas «No es para mí» y los mensajes denunciados solo los revisa nuestro equipo. Nuestro equipo solo accede a una conversación privada si ha sido formalmente denunciada."
            : "Other mothers see your first name, neighbourhood and Forum posts (or “A mother” when you post anonymously), your public reviews, and the messages you send them. Organisers of an event or gathering you book — communities, studios, hosts and mothers — see your first name and stage only; your email and phone stay with The Mothers. “Not for me” reviews and reported messages are seen only by our team. Our team reads a private conversation only when it is reported.",
      },
      {
        n: "06",
        title: lang === "fr" ? "Avec qui nous le partageons" : lang === "es" ? "Con quién lo compartimos" : "Who we share it with",
        body:
          lang === "fr"
            ? "Le strict minimum nécessaire est transmis aux outils essentiels au fonctionnement du club : traitement des paiements (Stripe — y compris le compte Stripe de l'organisateur lorsque vous réglez un événement de communauté), messagerie email (Brevo) et hébergement. Nous ne vendons pas vos données et ne transmettons vos coordonnées à aucune entreprise sans votre demande. Certains outils sont basés hors de l'UE ; le cas échéant, nous appliquons les clauses contractuelles types et garanties européennes."
            : lang === "es"
            ? "Solo facilitamos los datos estrictamente necesarios a los proveedores esenciales del club: procesamiento de pagos (Stripe, incluida la cuenta Stripe del organizador al pagar un evento de comunidad), envíos de correo transaccional (Brevo) y servidores de alojamiento web. No comercializamos tus datos ni los cedemos a empresas terceras salvo petición expresa. Determinadas herramientas operan fuera de la UE, rigiéndose en tal caso por cláusulas contractuales tipo homologadas."
            : "The minimum necessary data goes to the tools that run the club: payment processing (Stripe — including the organiser’s Stripe account when you pay for a community event), email (Brevo) and hosting. We do not sell your data and do not pass your details to a business unless you ask. Some tools are based outside the EU; where that is the case we rely on standard contractual safeguards.",
      },
      {
        n: "07",
        title: lang === "fr" ? "Durée de conservation" : lang === "es" ? "Plazos de conservación" : "Retention",
        body:
          lang === "fr"
            ? "Nous conservons vos données tant que votre compte est ouvert, et pendant une durée limitée après sa fermeture pour satisfaire à nos obligations comptables et légales. Les messages sont conservés tant que les deux comptes concernés existent. Les inscriptions à la lettre sont conservées jusqu'à désabonnement. Si vous supprimez votre compte, vos données personnelles sont effacées, vos publications sur Le Forum subsistent sans votre nom, les messages envoyés affichent « Une mère qui est partie » et les justificatifs de paiement ne sont conservés que le temps imposé par la législation fiscale."
            : lang === "es"
            ? "Conservamos tus datos mientras tu cuenta permanezca activa, y durante el tiempo estrictamente necesario tras su cierre para cumplir obligaciones contables y legales. Los mensajes se conservan mientras existan ambas cuentas. Los datos del boletín se mantienen hasta tu baja. Si eliminas tu cuenta, se borran tus datos personales, tus aportaciones en El Foro permanecen de forma anónima, tus mensajes enviados muestran «Una madre que se ha ido» y los justificantes de pago solo se conservan el periodo exigido por la normativa fiscal."
            : "We keep your data while your account is open, and for a limited period after it closes to meet accounting and legal obligations. Messages are kept while both accounts exist. Newsletter records are kept until you unsubscribe. If you delete your account, your personal data is removed, your Forum posts stay without your name, messages you sent show “A mother who left”, and payment records are kept only as long as tax law requires.",
      },
      {
        n: "08",
        title: lang === "fr" ? "Sécurité" : lang === "es" ? "Seguridad" : "Security",
        body:
          lang === "fr"
            ? "L'accès aux données des comptes est limité à la petite équipe qui en a besoin. Les messages privés sont stockés de façon sécurisée mais ne sont pas chiffrés de bout en bout. Aucun système n'est infaillible, mais nous prenons des mesures techniques et organisationnelles raisonnables pour protéger vos données."
            : lang === "es"
            ? "El acceso a los datos de las cuentas está restringido al reducido equipo encargado de la operativa. Los mensajes privados se almacenan de forma segura pero no cuentan con cifrado de extremo a extremo. Ningún sistema informático es invulnerable, pero adoptamos las medidas técnicas y organizativas adecuadas para salvaguardar tu información."
            : "Access to account data is limited to the small team who need it. Private messages are stored securely but are not end-to-end encrypted. No system is immune to risk, but we take reasonable technical and organisational measures to protect your data.",
      },
      {
        n: "09",
        title: lang === "fr" ? "Cookies et stockage local" : lang === "es" ? "Cookies y almacenamiento local" : "Cookies and local storage",
        body:
          lang === "fr"
            ? "Ce site web utilise le stockage local de votre navigateur pour vous maintenir connectée et mémoriser votre portefeuille, vos réservations et votre langue. Nous n'utilisons aucun cookie publicitaire ou de suivi tiers. Les cookies analytiques ne sont activés que si vous les acceptez dans le bandeau cookies ; vous pouvez modifier votre choix à tout moment depuis « Paramètres des cookies » en bas de page."
            : lang === "es"
            ? "Este sitio web utiliza el almacenamiento local de tu navegador para mantener iniciada tu sesión y recordar tu monedero, reservas e idioma. No empleamos cookies publicitarias ni de seguimiento de terceros. Las cookies analíticas solo se instalan si las aceptas expresamente en el banner de cookies; puedes modificar tu preferencia en cualquier momento desde «Ajustes de cookies» en el pie de página."
            : "This website uses your browser’s local storage to keep you signed in and to remember your wallet, bookings and language. We do not use advertising or tracking cookies. Analytics cookies are only set if you accept them in the cookie banner; you can change your choice from “Cookie settings” in the footer.",
      },
      {
        n: "10",
        title: lang === "fr" ? "Vos droits" : lang === "es" ? "Tus derechos" : "Your rights",
        body:
          lang === "fr"
            ? "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement ou de portabilité de vos données, ainsi que d'un droit d'opposition ou de limitation de certains traitements. Écrivez à hello@themothers.cc. Vous pouvez également adresser une réclamation auprès de l'autorité espagnole de protection des données (Agencia Española de Protección de Datos, aepd.es)."
            : lang === "es"
            ? "En virtud del RGPD puedes solicitar el acceso, rectificación, supresión o portabilidad de tus datos, así como oponerte o limitar determinados tratamientos. Escríbenos a hello@themothers.cc. También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es)."
            : "Under the GDPR you can ask to access, correct, delete or receive a copy of your data, and object to or restrict certain uses of it. Write to hello@themothers.cc. You can also complain to the Spanish data protection authority (Agencia Española de Protección de Datos, aepd.es).",
      },
      {
        n: "11",
        title: lang === "fr" ? "Modifications" : lang === "es" ? "Modificaciones" : "Changes",
        body:
          lang === "fr"
            ? "Nous pouvons faire évoluer cette politique au fur et à mesure que le club grandit. Toute modification est publiée ici avec une date mise à jour, et nous informons les titulaires de compte par email de toute modification affectant substantiellement le traitement de leurs données."
            : lang === "es"
            ? "Podemos actualizar esta política con la evolución del club. Toda modificación se publicará en esta página con su fecha de revisión, y notificaremos por email a las usuarias registradas ante cualquier cambio sustancial en el tratamiento de sus datos."
            : "We may update this policy as the club evolves. Any change is posted here with an updated date, and we email account holders about any change that materially affects how we handle their data.",
      },
    ],
  };

  return (
    <div style={{ background: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", minHeight: "100vh" }}>
      {/* Intro Section */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(36px, 5vw, 62px) clamp(20px, 5vw, 64px) clamp(16px, 2vw, 24px)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "12px" }}>
          Legal
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4.2vw, 48px)", lineHeight: 1.1, margin: "0 0 10px" }}>
          {privacyData.title}
        </h1>
        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.58)", margin: "0 0 22px" }}>
          {privacyData.meta}
        </p>

        {privacyData.convenienceNote && (
          <p style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.6)", margin: "-14px 0 22px" }}>
            {privacyData.convenienceNote}
          </p>
        )}

        <p style={{ fontSize: "16px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.74)", margin: 0, textAlign: "justify" }}>
          {privacyData.intro}
        </p>
      </section>

      {/* Sections List */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(16px, 2vw, 24px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)" }}>
        {privacyData.sections.map((s) => (
          <div key={s.n} style={{ display: "flex", gap: "clamp(14px, 2vw, 26px)", borderTop: "1px solid rgba(57, 41, 42, 0.14)", padding: "22px 0" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "20px", color: "rgba(123, 31, 44, 0.4)", fontFeatureSettings: "'tnum'", flex: "none", width: "34px" }}>
              {s.n}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "20px", margin: "0 0 8px" }}>
                {s.title}
              </h2>
              <p style={{ fontSize: "15px", lineHeight: 1.72, color: "rgba(57, 41, 42, 0.74)", margin: 0, textAlign: "justify" }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}

        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.58)", borderTop: "1px solid rgba(57, 41, 42, 0.14)", paddingTop: "20px", margin: 0 }}>
          {lang === "fr" ? "Des questions ? Écrivez à " : lang === "es" ? "¿Preguntas? Escríbenos a " : "Questions? Write to "}
          <a href="mailto:hello@themothers.cc" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            hello@themothers.cc
          </a>.
        </p>
      </section>
    </div>
  );
}
