"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function LegalPage() {
  const { language: lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#privacy") {
        setActiveTab("privacy");
      } else if (hash === "#terms") {
        setActiveTab("terms");
      }
    }
  }, []);

  const isEn = lang === "en";

  const termsData = {
    title: isEn ? "Terms & Conditions" : "Términos y Condiciones",
    meta: isEn ? "Last updated 27 September 2026 · Barcelona, Spain" : "Última actualización: 27 de septiembre de 2026 · Barcelona, España",
    intro: isEn
      ? "These Terms govern your use of themothers.cc and of the account, credit wallet and events offered on it. The Mothers is a club for mothers in Barcelona. Membership is not yet on sale; until it opens in January 2027 the calendar is open to every mother on the terms below. By opening an account or booking a place you agree to be bound by these Terms."
      : "Estos Términos regulan el uso de themothers.cc, así como de la cuenta, monedero de créditos y eventos ofrecidos en la web. The Mothers es un club para madres en Barcelona. La membresía aún no está a la venta; hasta su apertura en enero de 2027 el calendario está abierto a todas las madres según los términos que figuran a continuación. Al crear una cuenta o reservar una plaza, aceptas quedar vinculada por estos Términos.",
    sections: isEn
      ? [
          {
            n: "01",
            title: "Who can take part",
            body: "The Mothers is for mothers, and expecting counts — if you are pregnant, you are welcome. Accounts, credits and event places are offered on that basis. If you tell us you are not a mother we cannot offer you a place at an event, and you are welcome to join the letter instead so we can write to you if that changes.",
          },
          {
            n: "02",
            title: "Accounts",
            body: "An account is created when you book your first event, with your name, email, phone number and a password. There is no application and no fee, and holding one does not make you a member of the club or entitle you to anything beyond what is published on the calendar. You are responsible for keeping your password to yourself and for anything booked from your account. You may close it at any time by writing to us.",
          },
          {
            n: "03",
            title: "Credits",
            body: "Credits are bought at a flat €2 each, in the exact quantity you choose, and are held in your wallet. Each credit expires six months after purchase and the oldest credits in a wallet are always spent first. Credits are not money, cannot be exchanged for cash and are not transferable between accounts. Where your balance does not cover an event, you add the shortfall in your account and the place is booked as soon as payment succeeds. Credits can also be earned: 2 for hosting an event once it has run, and 5 through the Godmother programme for each mother who becomes a member with your code. Earned credits follow the same six-month rule. When membership opens, members receive credits with their membership; credits already bought keep their full six-month life and can be spent as before.",
          },
          {
            n: "04",
            title: "Bookings and cancellations",
            body: "Every event has a fixed capacity except those published as an open list, and places are confirmed in the order received. Each event carries its own cancellation window, shown on the event and at booking. Release a place inside that window and the credits return to your wallet in full; after it, they return only if the place is filled before the event starts. Walks and park socials cost members no credits and so carry nothing to refund. If you book and do not come without releasing your place, it is recorded as a no-show and you cannot host an event for three months after it.",
          },
          {
            n: "05",
            title: "Events with a minimum",
            body: "Some events carry a fixed cost to us — a speaker, a studio, a private room — and are published with the minimum number of attendees needed to run. Reserving a place on one holds your credits rather than spending them: they are deducted when the event is confirmed, which happens no later than ten days before the start time, and they return to your wallet in full if the event does not go ahead or if you release the place before confirmation. Where a minimum is not met, the team decides whether to run the event anyway or cancel it; if it is cancelled, every credit held is returned to your wallet in full.",
          },
          {
            n: "06",
            title: "Children and family safety",
            body: "Every event is labelled clearly as children welcome or mothers only, so you know what to expect before you book. Unless an event explicitly provides childcare, parents and guardians remain responsible for supervising their own children throughout. The Mothers takes reasonable care in choosing venues and partners but is not a substitute for parental supervision.",
          },
          {
            n: "07",
            title: "Community standards",
            body: "We ask everyone who comes to treat other mothers, hosts and partners with respect, and to keep shared spaces safe for children. Selling to other attendees is not allowed. In The Circle, the same standards apply: posts stay linked to your account even when shown anonymously, photos may not show other people’s children without their parent’s permission, and posting is limited to prevent spam. Reported posts are reviewed the same day and may be hidden or removed. We reserve the right to refuse or withdraw a place from anyone whose conduct puts others at risk or who otherwise breaches these Terms.",
          },
          {
            n: "08",
            title: "Partners and third-party services",
            body: "Classes, sessions and services provided by our partners are delivered by independent third parties. The Mothers curates and recommends them but is not responsible for the quality, safety or delivery of services they provide directly. Any contract for a partner service outside our calendar is between you and that partner.",
          },
          {
            n: "09",
            title: "Payments",
            body: "Credits are paid for by card through our payment provider, which handles and stores the card details — we do not hold them. Until membership opens nothing on this site is a subscription: there is no recurring charge, and nothing to cancel. Receipts are emailed at the moment of purchase.",
          },
          {
            n: "10",
            title: "When membership opens",
            body: "Membership is expected to open in January 2027, at the rates published on the site at the time. Nothing on this page is an offer of membership or a promise of a place, and the terms of membership will be published in full before anyone is asked to pay for it. Accounts opened before membership opens will not pay a joining fee.",
          },
          {
            n: "11",
            title: "Members and non-members",
            body: "Once membership opens, members and non-members can book the same events. Each event has a member price and a non-member price in credits, both shown on the event; you pay the price that applies to you at the moment of booking. Some events with limited places open to members first and to everyone else from a date shown on the event.",
          },
          {
            n: "12",
            title: "Hosting",
            body: "Some events are marked as needing a host. A host welcomes the other mothers, arrives ten minutes early and makes the introductions. To host you need an account, at least two events attended and no no-show in the last three months. A request is confirmed by the team by email and may be declined. A host receives 2 credits once the event has run, plus 50% of what she paid for her place (rounded down), in credits. A host who cannot attend should cancel at least 48 hours before; a host who cancels later, or does not come, can host again after attending three more events.",
          },
          {
            n: "13",
            title: "Suspension and closing an account",
            body: "We may suspend an account that breaks these Terms or the community standards. While suspended you cannot book or post; your bookings and credits are frozen, not refunded, and we will tell you why by email. You may ask us to close your account and delete your data at any time. Future bookings are then cancelled, remaining credits are forfeited, and your posts in The Circle remain without your name.",
          },
          {
            n: "14",
            title: "Intellectual property",
            body: "All text, photography, branding and design on this website belong to The Mothers or are used with permission. You may not reproduce or repurpose this content without our written consent.",
          },
          {
            n: "15",
            title: "Limitation of liability",
            body: "The Mothers facilitates community, events and introductions in good faith, but participation in any event or activity is at your own discretion and risk. To the fullest extent permitted by law, The Mothers is not liable for indirect or consequential loss arising from your attendance at an event.",
          },
          {
            n: "16",
            title: "Changes and governing law",
            body: "We may update these Terms as the club grows, and will post any revision here with an updated date. These Terms are governed by the laws of Spain, and any dispute arising from them is subject to the exclusive jurisdiction of the courts of Barcelona.",
          },
        ]
      : [
          {
            n: "01",
            title: "Quién puede participar",
            body: "The Mothers es para madres, y el embarazo cuenta: si estás embarazada, eres bienvenida. Las cuentas, los créditos y las plazas en eventos se ofrecen sobre esta base. Si nos indicas que no eres madre, no podremos ofrecerte plaza en un evento, y te invitamos a unirte a la carta para escribirte si eso cambia.",
          },
          {
            n: "02",
            title: "Cuentas",
            body: "Se crea una cuenta al reservar tu primer evento con tu nombre, correo, teléfono y contraseña. No hay solicitud previa ni cuota de inscripción, y tener cuenta no te convierte en socia del club ni otorga derechos fuera de lo publicado en el calendario. Eres responsable de la confidencialidad de tu contraseña y de las reservas realizadas desde tu cuenta. Puedes cerrarla en cualquier momento escribiéndonos.",
          },
          {
            n: "03",
            title: "Créditos",
            body: "Los créditos se compran a un precio fijo de 2€ cada uno, en la cantidad exacta que desees, y se almacenan en tu monedero. Cada crédito caduca a los seis meses de su compra y los más antiguos siempre se consumen primero. Los créditos no son dinero, no se canjean por efectivo y no son transferibles. Si tu saldo no cubre un evento, adquieres la diferencia al reservar. Los créditos también se pueden ganar: 2 por ser anfitriona de un evento una vez celebrado, y 5 a través del programa Godmother por cada madre que se una con tu código. Tienen la misma validez de 6 meses. Al abrir la membresía, los créditos adquiridos conservan su vigencia íntegra.",
          },
          {
            n: "04",
            title: "Reservas y cancelaciones",
            body: "Cada evento tiene un aforo fijo salvo los publicados como lista abierta, y las plazas se confirman por orden de llegada. Cada evento tiene su propia ventana de cancelación indicada en la ficha. Si liberas tu plaza dentro de ese plazo, los créditos vuelven íntegros a tu monedero; fuera de plazo, solo se devuelven si la plaza es ocupada antes del evento. Los paseos y encuentros en el parque no consumen créditos y no conllevan devolución. Si no asistes sin liberar tu plaza, constará como ausencia y no podrás ser anfitriona durante los 3 meses siguientes.",
          },
          {
            n: "05",
            title: "Eventos con mínimo de asistentes",
            body: "Algunos eventos conllevan costes fijos (ponentes, espacios) y se publican con el número mínimo de asistentes necesario para celebrarse. Reservar plaza retiene los créditos en vez de gastarlos: se descuentan al confirmarse el evento (máximo 10 días antes), y vuelven íntegros si el evento no se realiza o si liberas tu plaza antes de la confirmación.",
          },
          {
            n: "06",
            title: "Niños y seguridad familiar",
            body: "Cada evento indica si los niños son bienvenidos o si es exclusivo para madres. Salvo indicación expresa de cuidado infantil in situ, madres y tutores son responsables de la supervisión de sus hijos en todo momento.",
          },
          {
            n: "07",
            title: "Normas de la comunidad",
            body: "Pedimos a todas las asistentes tratar con respeto a otras madres, anfitrionas y colaboradores, y preservar un entorno seguro. No está permitida la venta directa ni la prospección comercial. En The Circle, las publicaciones permanecen asociadas a la cuenta incluso si se muestran anónimas. No se permite publicar fotos de menores ajenos sin autorización de sus progenitores. Las publicaciones reportadas se revisan el mismo día.",
          },
          {
            n: "08",
            title: "Partners y servicios de terceros",
            body: "Las clases y servicios prestados por nuestras colaboradoras son impartidos por terceros independientes. The Mothers los recomienda con esmero pero no se responsabiliza de los servicios prestados de forma directa.",
          },
          {
            n: "09",
            title: "Pagos",
            body: "Los créditos se abonan con tarjeta mediante nuestra pasarela de pago segura, que gestiona y almacena los datos bancarios: nosotros no almacenamos datos de pago. Hasta la apertura de membresía no hay suscripciones ni cobros periódicos.",
          },
          {
            n: "10",
            title: "Apertura de membresía",
            body: "La apertura de la membresía oficial está prevista para enero de 2027 a las tarifas vigentes en ese momento. Las cuentas creadas antes de la apertura disfrutarán de la exención permanente de la cuota de inscripción (19€).",
          },
          {
            n: "11",
            title: "Socias y no socias",
            body: "Tras la apertura de membresía, socias y no socias podrán reservar eventos. Cada evento mostrará el precio para socias y el precio general en créditos. Algunos eventos con plazas limitadas abrirán prioritariamente para socias.",
          },
          {
            n: "12",
            title: "Anfitrionas (Hosting)",
            body: "Algunos eventos requieren anfitriona. La anfitriona da la bienvenida, llega 10 minutos antes y dinamiza el grupo. Para solicitar ser anfitriona se requiere haber asistido al menos a 2 eventos y no tener ausencias injustificadas en los últimos 3 meses. Recibe 2 créditos una vez celebrado el evento más el 50% de reembolso en créditos de su plaza. Si cancela con menos de 48h o no asiste, deberá asistir a 3 eventos más antes de poder solicitarlo de nuevo.",
          },
          {
            n: "13",
            title: "Suspensión y baja de cuenta",
            body: "Podemos suspender cuentas que incumplan estos Términos o las normas comunitarias. Durante la suspensión no se puede reservar ni publicar; los créditos y reservas quedan congelados. Puedes solicitar el borrado de tu cuenta en cualquier momento: las reservas futuras se cancelan, los créditos restantes se extinguen y tus mensajes en The Circle se anonimizan.",
          },
          {
            n: "14",
            title: "Propiedad intelectual",
            body: "Todos los textos, fotografías, diseño y marca de este sitio web pertenecen a The Mothers o se usan bajo licencia. Queda prohibida su reproducción sin consentimiento previo.",
          },
          {
            n: "15",
            title: "Limitación de responsabilidad",
            body: "The Mothers facilita la comunidad y los encuentros de buena fe, pero la participación en cualquier actividad se realiza bajo la propia responsabilidad de cada asistente.",
          },
          {
            n: "16",
            title: "Cambios y legislación aplicable",
            body: "Podemos actualizar estos Términos periódicamente. Se rigen por las leyes de España, con jurisdicción exclusiva en los tribunales de Barcelona.",
          },
        ],
  };

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
            body: "When you book your first event we create your account with your name, email address and phone number. When you book an event we record which event, when, and what it cost in credits; for walks and park socials we also ask for a phone number so we can send the exact meeting point, which we do not publish. When you buy credits, the card details are captured and processed by our payment provider and are not stored on our systems — we keep the amount, the date and the receipt. If you write to us, we keep that correspondence. If you use The Circle we keep your posts, replies, photos and any reports you make; posts shown anonymously are still linked to your account. If you host or invite friends we keep your host requests, attendance and no-show records, your Godmother code and who registered with it.",
          },
          {
            n: "02",
            title: "How we use it",
            body: "To run your account and wallet, to confirm and manage your bookings, to send the practical emails an event needs — confirmations, meeting points, changes, and the reminder before credits expire — and, if you asked for it, the monthly letter. We will write to you once before January 2027 to tell you membership is opening; you can decline that at any time. We never use your data to sell to you on behalf of a partner without your direct request.",
          },
          {
            n: "03",
            title: "Children's information",
            body: "Where we ask about your children, it is only to plan events for the right age groups and to label them correctly. We do not collect children's names or other identifying details. A photo posted in The Circle that shows a child requires the poster to confirm she is the parent or has the parent's permission. Where an event involves photography, we ask separately and clearly for your consent.",
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
            body: "We keep your account and booking data for as long as your account is open, and for a limited period after it closes to meet accounting and legal obligations. Newsletter records are kept until you unsubscribe. If you ask us to delete your account, your personal data is removed, your Circle posts stay without your name, and payment records are kept only as long as tax law requires.",
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
            body: "Al reservar tu primer evento creamos tu cuenta con nombre, correo electrónico y teléfono. Al reservar un evento registramos los datos del mismo y su coste en créditos; en paseos pedimos teléfono para enviar por WhatsApp la ubicación exacta de encuentro. Para la compra de créditos, los datos de tarjeta son procesados por Stripe. Si participas en The Circle se guardan tus mensajes y fotos; las publicaciones anónimas siguen vinculadas internamente a tu cuenta.",
          },
          {
            n: "02",
            title: "Cómo lo usamos",
            body: "Para gestionar tu cuenta y monedero, confirmar reservas, enviar avisos y puntos de encuentro, y avisar 30 días antes de la caducidad de créditos. Te informaremos puntualmente antes de enero de 2027 de la apertura de la membresía.",
          },
          {
            n: "03",
            title: "Información sobre menores",
            body: "Las preguntas sobre etapas familiares sirven exclusivamente para planificar eventos adaptados. No recopilamos nombres de menores ni datos sensibles. Las fotos en The Circle que incluyan menores requieren confirmación de tutela parental o autorización explícita.",
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
            body: "Conservamos los datos mientras tu cuenta permanezca activa y durante los plazos legalmente exigidos. Si solicitas la supresión de tu cuenta, tus datos personales se eliminan y tus aportaciones en The Circle quedan anonimizadas.",
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

  const currentData = activeTab === "terms" ? termsData : privacyData;

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
          {currentData.title}
        </h1>
        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.58)", margin: "0 0 22px" }}>
          {currentData.meta}
        </p>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            gap: 0,
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "4px",
            overflow: "hidden",
            maxWidth: "420px",
            marginBottom: "26px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("terms");
              if (typeof window !== "undefined") window.location.hash = "terms";
            }}
            style={{
              flex: 1,
              border: "none",
              backgroundColor: activeTab === "terms" ? "rgba(123, 31, 44, 0.1)" : "transparent",
              color: activeTab === "terms" ? "#7b1f2c" : "rgba(57, 41, 42, 0.7)",
              padding: "11px 10px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "14.5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {isEn ? "Terms & Conditions" : "Términos y Condiciones"}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("privacy");
              if (typeof window !== "undefined") window.location.hash = "privacy";
            }}
            style={{
              flex: 1,
              border: "none",
              borderLeft: "1px solid rgba(57, 41, 42, 0.2)",
              backgroundColor: activeTab === "privacy" ? "rgba(123, 31, 44, 0.1)" : "transparent",
              color: activeTab === "privacy" ? "#7b1f2c" : "rgba(57, 41, 42, 0.7)",
              padding: "11px 10px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "14.5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {isEn ? "Privacy Policy" : "Política de Privacidad"}
          </button>
        </div>

        <p style={{ fontSize: "16px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.74)", margin: 0, textAlign: "justify" }}>
          {currentData.intro}
        </p>
      </section>

      {/* ─── Document Sections ─── */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(16px, 2vw, 24px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)" }}>
        {currentData.sections.map((s) => (
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
