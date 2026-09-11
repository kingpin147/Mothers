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
        { n: "01", title: "Membership & the Membership Window", body: "Membership is by application. A Membership Window opens once a month and stays open for one week; in each Window we open a limited number of spots — and our first 50 accepted members join with no joining fee. Outside a Window, applications join a waitlist and are reviewed at the next opening. Submitting an application does not guarantee acceptance; we review each application individually to keep the community safe and considered." },
        { n: "02", title: "Fees & billing", body: "Membership is €39/month or €99 every 3 months — one rate, whichever billing frequency you choose when you apply. We'll always notify you before a rate change takes effect. A one-time joining fee of €19 is charged with your first payment, with two exceptions: our first 50 accepted members join with no joining fee at all, and the fee is waived for anyone who has taken an Event Pass in the 30 days before joining. The joining fee is not refundable once membership has begun. Payment is collected by card. You may cancel at any time with no cancellation fee — your membership ends at the close of the current billing period. You may pause your membership for up to two months per calendar year at no cost; your credit expiry clock pauses along with it. If you cancel and rejoin later, the joining fee applies again unless one of the exceptions above is met." },
        { n: "03", title: "Credits", body: "Active members receive 20 credits each month to redeem against bookable experiences. Walks and park socials are always free and unlimited, and never draw from your credit balance. Unused credits roll over with no maximum balance, and each credit expires 6 months after it is issued — oldest credits are always used first, and we'll email you when a credit is within 30 days of expiring. Additional credits can be purchased at any time at a flat rate of €1 per credit, in the exact amount needed, and join your balance under the same rollover and expiry rules. Where your balance does not cover an event, the shortfall can be purchased at the point of booking in the same step; on an event still awaiting its minimum those credits are held rather than spent, and are returned in full if it does not go ahead." },
        { n: "04", title: "Event Pass", body: "If you're not a member, you may attend any event other than a Signature moment with an Event Pass, €35 per event — walks and park socials remain free to everyone. Each person may purchase a maximum of two Event Passes in total, counted against the email address given at checkout. Each event has a set number of Event Pass places, two unless we state otherwise on the event itself, and a smaller or larger number may apply while an event is still gathering the members it needs to run; guest places open fourteen days before the event and close two days before it, and a pass may be used on any event other than a Signature moment valued at up to 18 credits — Signature moments and events above that value are reserved for members. Event Pass places are non-transferable and are not refunded if you change your mind — you may instead release the place through the link in your confirmation email, so that another mother can take it. If an event does not go ahead, whether because a minimum was not reached or for any other reason, Event Pass guests are refunded in full to the card used. Places are booked and paid for individually through the checkout flow on this website. Because every room is a vetted one, guests answer a short set of questions before purchase, and the place is only charged once that check passes. Your confirmation email carries the meeting point and a link to view or release your place; no account is required. If you join The Mothers within thirty days of the event you attended, the €35 you paid is credited against your membership — applied first to the joining fee where one applies, and any remainder to your first billing period. The credit applies once, to one Event Pass, and is not exchangeable for cash." },
        { n: "05", title: "Bookings, capacity & cancellations", body: "Every event has a fixed capacity, and bookings are confirmed in the order received — except on included walks and park socials, where members book first and non-members join an open list that is released once member bookings settle. Some walks and park socials carry no limit on places at all; on those, anyone who leaves her details is on the list immediately and there is no list to release. Members may not hold two bookings for overlapping time slots. Members can cancel an upcoming booking directly from their account; any credit spent on that booking is returned in full when you cancel more than 24 hours before the start time. Some events — those where a partner, venue or speaker fee is committed in advance — are published unconfirmed with a minimum number of members needed to run. Which events these are depends on the agreement behind each one, and is always shown on the event itself before you reserve. Reserving a place on one holds the credits rather than spending them: they are deducted only when the event is confirmed, which happens no later than ten days before the start time, and they return to your balance in full if it does not go ahead or if you release the place before confirmation. Where a minimum is not met we will normally move the event to a new date and carry your place across rather than cancel it. Inside 24 hours, the credit is returned only if the place is filled from the waitlist before the event starts; if it goes unfilled, the credit is forfeited. Repeated no-shows affect access: two no-shows within any three-month period pause your ability to RSVP until you write to us at hello@themothers.cc, so that places stay available to members who will use them. Included walks and park socials draw no credit and are not eligible for any refund or credit if cancelled, since they carry no charge to begin with. Guests who need to cancel should use the link in their confirmation email, or contact hello@themothers.cc." },
        { n: "06", title: "Children & family safety", body: "Every event is labelled clearly as child-inclusive, offering on-site childcare, or adults-only, so you always know what to expect before you book. Unless an event explicitly provides childcare, parents and guardians remain responsible for supervising their own children throughout. The Mothers takes reasonable care in selecting venues and partners but is not a substitute for parental supervision." },
        { n: "07", title: "Community standards", body: "The Mothers is a vetted, private space. We ask every member to treat other members, hosts and partners with respect, and to keep shared spaces safe for children. We reserve the right to suspend or remove any member whose conduct puts other members, children, or the community at risk, or who otherwise breaches these Terms — without a refund of the current billing period." },
        { n: "08", title: "Partners & third-party services", body: "Partner discounts, classes and services listed on this website are provided by independent third parties. The Mothers curates and recommends these partners but is not responsible for the quality, safety, or delivery of services they provide directly. Any contract for a partner service is between you and that partner." },
        { n: "09", title: "Intellectual property", body: "All text, photography, branding and design on this website belong to The Mothers or are used with permission. You may not reproduce or repurpose this content without our written consent." },
        { n: "10", title: "Limitation of liability", body: "The Mothers facilitates community, events and introductions in good faith, but participation in any event or activity is at your own discretion and risk. To the fullest extent permitted by law, The Mothers is not liable for indirect or consequential loss arising from your membership or attendance at an event." },
        { n: "11", title: "Changes to these Terms", body: "We may update these Terms from time to time as the club grows. We'll post any revision on this page with an updated date, and we'll email active members ahead of any change that materially affects their membership." },
        { n: "12", title: "Governing law", body: "These Terms are governed by the laws of Spain, and any dispute arising from them will be subject to the exclusive jurisdiction of the courts of Barcelona." },
        { n: "13", title: "Contact", body: "Questions about these Terms? Write to us at hello@themothers.cc." },
      ]
    : [
        { n: "00", title: "Quién puede unirse", body: "The Mothers es un club privado para madres. La membresía, los Event Pass y los eventos de pago están abiertos a mujeres que son madres o que están embarazadas — el embarazo cuenta. Los paseos y encuentros en el parque son abiertos a todas en las mismas condiciones. Si nos dices que no eres madre, no podemos ofrecerte una plaza en un evento, y estás invitada a unirte a la Carta para que podamos escribirte si eso cambia." },
        { n: "01", title: "Membresía y la Ventana de membresía", body: "La membresía es por solicitud. Cada mes se abre una Ventana de membresía y permanece abierta una semana; en cada Ventana abrimos un número limitado de plazas — y nuestras primeras 50 socias aceptadas entran sin cuota de inscripción. Fuera de una Ventana, las solicitudes se incorporan a una lista de espera y se revisan en la siguiente apertura. Enviar una solicitud no garantiza la aceptación; revisamos cada solicitud de forma individual para mantener la comunidad segura y cuidada." },
        { n: "02", title: "Tarifas y facturación", body: "La membresía cuesta 39€/mes o 99€ cada 3 meses — una sola tarifa, con la frecuencia de facturación que elijas al solicitar tu plaza. Siempre te avisaremos antes de que un cambio de tarifa entre en vigor. Se cobra una cuota única de inscripción de 19€ con tu primer pago, con dos excepciones: nuestras primeras 50 socias aceptadas entran sin cuota de inscripción, y la cuota no se cobra a quien haya tomado un Event Pass en los 30 días anteriores. La cuota de inscripción no es reembolsable una vez iniciada la membresía. El pago se realiza con tarjeta. Puedes cancelar en cualquier momento sin cuota de cancelación — tu membresía finaliza al cierre del periodo de facturación en curso. Puedes pausar tu membresía hasta dos meses por año natural sin coste; el reloj de caducidad de tus créditos se pausa junto con ella. Si cancelas y vuelves más adelante, la cuota de inscripción se aplica de nuevo salvo que se cumpla una de las excepciones anteriores." },
        { n: "03", title: "Créditos", body: "Las socias activas reciben 20 créditos cada mes para usar en experiencias reservables. Los paseos y encuentros en el parque son siempre gratuitos e ilimitados, y nunca consumen tu saldo de créditos. Los créditos no usados se acumulan sin límite de saldo, y cada crédito caduca 6 meses después de emitirse — siempre se usan primero los créditos más antiguos, y te avisaremos por correo cuando a un crédito le queden 30 días para caducar. Puedes comprar créditos adicionales en cualquier momento a un precio fijo de 1€ por crédito, en la cantidad exacta que necesites, que se incorporan a tu saldo bajo las mismas reglas de acumulación y caducidad." },
        { n: "04", title: "Event Pass", body: "Si no eres socia, puedes asistir a cualquier evento que no sea un Signature moment con un Event Pass, 35€ por evento — los paseos y encuentros en el parque siguen siendo gratuitos para todas. Cada persona puede comprar un máximo de dos Event Pass en total, contados según el correo indicado al pagar. Cada evento tiene un número determinado de plazas de invitada, dos salvo que se indique otra cifra en el evento, y puede aplicarse un número distinto mientras el evento aún reúne el mínimo de socias necesario; las plazas de invitada se abren catorce días antes del evento y se cierran dos días antes. Las plazas no son transferibles y no se devuelven si cambias de idea — puedes liberar la plaza para que otra madre pueda ocuparla. Si un evento no se celebra, ya sea porque no se alcanza el mínimo o por cualquier otro motivo, las invitadas con Event Pass reciben el reembolso íntegro en la tarjeta utilizada. Las plazas se reservan y pagan de forma individual a través del proceso de compra de este sitio web. Como cada sala está seleccionada, las invitadas responden unas preguntas breves antes de la compra, y la plaza solo se cobra cuando esa comprobación se supera. Tu correo de confirmación lleva el punto de encuentro y un enlace para ver o liberar tu plaza; no hace falta cuenta. Si te unes a The Mothers en los treinta días siguientes al evento al que asististe, los 35€ que pagaste se descuentan de tu membresía — primero de la cuota de inscripción cuando se aplique, y el resto de tu primer periodo de facturación. El descuento se aplica una sola vez, a un Event Pass, y no es canjeable por dinero." },
        { n: "05", title: "Reservas, aforo y cancelaciones", body: "Cada evento tiene un aforo fijo, y las reservas se confirman por orden de llegada — salvo en los paseos y encuentros en el parque incluidos, donde las socias reservan primero y las no socias entran en una lista de espera que se libera cuando las reservas de socias se cierran. Las socias no pueden mantener dos reservas con franjas horarias que se solapen. Las socias pueden cancelar una reserva próxima directamente desde su cuenta; cualquier crédito usado en esa reserva se devuelve íntegramente si cancelas con más de 24 horas de antelación. Algunos eventos — aquellos en los que se compromete de antemano el pago a una partner, un espacio o una ponente — se publican sin confirmar, con un número mínimo de socias necesario para celebrarse. Qué eventos son depende del acuerdo detrás de cada uno, y siempre se indica en el propio evento antes de reservar. Reservar plaza en uno de ellos retiene los créditos en lugar de gastarlos: se descuentan solo cuando el evento se confirma, como muy tarde diez días antes de la hora de inicio, y vuelven íntegros a tu saldo si no se celebra o si liberas la plaza antes de la confirmación. Si no se alcanza el mínimo, normalmente moveremos el evento a una nueva fecha y trasladaremos tu plaza en lugar de cancelarlo. Con menos de 24 horas, el crédito solo se devuelve si la plaza se cubre desde la lista de espera antes del evento; si queda vacía, el crédito se pierde. Las ausencias reiteradas afectan al acceso: dos ausencias sin avisar en un periodo de tres meses pausan tu posibilidad de reservar hasta que nos escribas a hello@themothers.cc, para que las plazas queden disponibles para socias que vayan a usarlas. Los paseos y encuentros en el parque incluidos no consumen créditos y no dan derecho a reembolso ni devolución de crédito si se cancelan, ya que no tienen coste asociado. Las invitadas que necesiten cancelar deben usar el enlace de su correo de confirmación, o escribir a hello@themothers.cc." },
        { n: "06", title: "Niños y seguridad familiar", body: "Cada evento está etiquetado con claridad como apto para niños, con cuidado infantil in situ, o solo para adultas, para que siempre sepas qué esperar antes de reservar. Salvo que un evento incluya expresamente cuidado infantil, madres y tutores son responsables de supervisar a sus propios hijos en todo momento. The Mothers pone un cuidado razonable en la selección de espacios y partners, pero no sustituye la supervisión parental." },
        { n: "07", title: "Normas de la comunidad", body: "The Mothers es un espacio privado y verificado. Pedimos a cada socia que trate con respeto a otras socias, anfitrionas y partners, y que mantenga los espacios compartidos seguros para los niños. Nos reservamos el derecho de suspender o dar de baja a cualquier socia cuya conducta ponga en riesgo a otras socias, a los niños o a la comunidad, o que incumpla estos Términos — sin reembolso del periodo de facturación en curso." },
        { n: "08", title: "Partners y servicios de terceros", body: "Los descuentos, clases y servicios de partners que aparecen en este sitio web los prestan terceros independientes. The Mothers selecciona y recomienda a estos partners, pero no es responsable de la calidad, seguridad o prestación de los servicios que ofrecen directamente. Cualquier contrato por un servicio de un partner es entre tú y ese partner." },
        { n: "09", title: "Propiedad intelectual", body: "Todos los textos, fotografías, marca y diseño de este sitio web pertenecen a The Mothers o se usan con autorización. No puedes reproducir ni reutilizar este contenido sin nuestro consentimiento por escrito." },
        { n: "10", title: "Limitación de responsabilidad", body: "The Mothers facilita comunidad, eventos y presentaciones de buena fe, pero la participación en cualquier evento o actividad es una decisión propia y bajo tu propio riesgo. En la medida máxima permitida por la ley, The Mothers no es responsable de pérdidas indirectas o consecuentes derivadas de tu membresía o de tu asistencia a un evento." },
        { n: "11", title: "Cambios en estos Términos", body: "Podemos actualizar estos Términos de vez en cuando a medida que el club crece. Publicaremos cualquier revisión en esta página con una fecha actualizada, y avisaremos por correo a las socias activas antes de cualquier cambio que afecte de forma relevante a su membresía." },
        { n: "12", title: "Ley aplicable", body: "Estos Términos se rigen por las leyes de España, y cualquier disputa derivada de ellos quedará sujeta a la jurisdicción exclusiva de los juzgados de Barcelona." },
        { n: "13", title: "Contacto", body: "¿Dudas sobre estos Términos? Escríbenos a hello@themothers.cc." },
      ];

  const privacySections = isEn
    ? [
        { n: "01", title: "Information we collect", body: "When you apply, we collect your name, contact details, motherhood stage, your children's ages, your neighbourhood, your goals for joining, your availability, your social handle and how you heard about us, plus any notes you choose to add. Once you're a member, we hold your booking history, credit balance, and billing details — payment card data is captured and processed by our payment provider, not stored on our own systems. If you write to us, we keep that correspondence too." },
        { n: "01b", title: "Free walks and open events", body: "Our walks and park socials are free and open to everyone, including non-members. To reserve a slot we ask for your name, surname, email and a phone number — the phone number so we can send you the exact meeting point by WhatsApp, since we do not publish it. We use these details for that walk and for the walk dates if you asked for them, and nothing else. Guests who take an Event Pass give us the same details, and we record them so we can apply the two-passes-in-total rule." },
        { n: "02", title: "How we use your information", body: "We use your information to review applications, plan events for your stage and your neighbourhood, manage your bookings and credit balance, process payments, and send you service communications — including the reminder we send 30 days before a credit expires. We never use your data to sell to you on behalf of a partner without your direct request." },
        { n: "03", title: "Children's information", body: "We ask for your children's ages only to plan events for the right age groups and to label them appropriately — we don't collect your children's names, photographs, or other identifying details as part of an application. Where an event involves photography, we'll ask separately and clearly for your consent." },
        { n: "04", title: "Legal basis for processing", body: "We process your application and membership data to perform our contract with you as a member, and with your consent where you've given it — for instance, marketing emails you can opt out of at any time. Where relevant, we rely on our legitimate interest in keeping the community safe and considered, balanced against your rights." },
        { n: "05", title: "Who we share it with", body: "We share the minimum necessary data with the tools that run the club: payment processing, email and scheduling providers. We do not sell your data, and we do not share your details with a partner business unless you've directly asked to be referred to them. Some of the tools we use may be based outside the EU; where that's the case, we rely on standard contractual safeguards." },
        { n: "06", title: "Data retention", body: "We keep your membership data for as long as you're a member, and for a limited period after you leave to meet our accounting and legal obligations. If your application is waitlisted or not accepted, we keep it only long enough to consider you for the next Window, after which it's deleted." },
        { n: "07", title: "Data security", body: "We limit access to member data to the small team who need it to run the club, and we work with providers who meet current data-protection standards. No system is completely immune to risk, but we take reasonable technical and organisational measures to protect your data against loss or misuse." },
        { n: "08", title: "Your rights", body: "Under the GDPR, you can ask to access, correct, delete, or receive a copy of your data, and you can object to or ask us to restrict certain uses of it. To exercise any of these rights, write to hello@themothers.cc. If you're not satisfied with our response, you can lodge a complaint with the Spanish data protection authority (Agencia Española de Protección de Datos, aepd.es)." },
        { n: "09", title: "Cookies & local storage", body: "This website uses your browser's local storage to remember your language preference and, for members, to keep you signed in — we don't use third-party advertising or tracking cookies." },
        { n: "10", title: "Changes to this policy", body: "We may update this Privacy Policy as the club and its tools evolve. We'll post any change here with an updated date, and email active members about any change that materially affects how we handle their data." },
        { n: "11", title: "Contact", body: "Questions about your data? Write to us at hello@themothers.cc." },
      ]
    : [
        { n: "01", title: "Información que recopilamos", body: "Cuando solicitas tu plaza, recopilamos tu nombre, datos de contacto, etapa de maternidad, las edades de tus hijos, tu barrio, tus motivos para unirte, tu disponibilidad, tu usuario en redes sociales y cómo nos conociste, además de cualquier nota que quieras añadir. Una vez eres socia, guardamos tu historial de reservas, tu saldo de créditos y tus datos de facturación — los datos de la tarjeta se capturan y procesan a través de nuestro proveedor de pagos, no se almacenan en nuestros propios sistemas. Si nos escribes, también conservamos esa correspondencia." },
        { n: "01b", title: "Paseos gratuitos y eventos abiertos", body: "Nuestros paseos y encuentros en el parque son gratuitos y abiertos a todas, también a quienes no son socias. Para reservar plaza pedimos nombre, apellido, correo y un teléfono — el teléfono para poder enviarte por WhatsApp el punto exacto de encuentro, ya que no lo publicamos. Usamos estos datos para ese paseo y, si lo has pedido, para enviarte las fechas de los próximos paseos. Nada más. Las invitadas que usan un Event Pass nos dan los mismos datos, y los guardamos para poder aplicar la regla de dos pases en total." },
        { n: "02", title: "Cómo usamos tu información", body: "Usamos tu información para revisar solicitudes, programar encuentros para tu etapa y tu barrio, gestionar tus reservas y tu saldo de créditos, procesar pagos, y enviarte comunicaciones de servicio — incluido el aviso que enviamos 30 días antes de que caduque un crédito. Nunca usamos tus datos para venderte algo en nombre de un partner sin que lo hayas solicitado directamente." },
        { n: "03", title: "Información sobre tus hijos", body: "Pedimos la edad de tus hijos únicamente para programar encuentros por grupo de edad y etiquetarlos correctamente — no recopilamos el nombre, fotografías u otros datos identificativos de tus hijos como parte de una solicitud. Cuando un evento incluya fotografía, pediremos tu consentimiento de forma separada y explícita." },
        { n: "04", title: "Base legal del tratamiento", body: "Tratamos los datos de tu solicitud y membresía para ejecutar el contrato contigo como socia, y con tu consentimiento cuando lo has dado — por ejemplo, los correos de marketing, que puedes cancelar en cualquier momento. Cuando es pertinente, nos basamos en nuestro interés legítimo en mantener la comunidad segura y cuidada, ponderado frente a tus derechos." },
        { n: "05", title: "Con quién compartimos tus datos", body: "Compartimos el mínimo de datos necesario con las herramientas que hacen funcionar el club: procesamiento de pagos, correo electrónico y planificación. No vendemos tus datos, y no compartimos tu información con un partner salvo que hayas pedido expresamente que te derivemos a él. Algunas de las herramientas que usamos pueden estar ubicadas fuera de la UE; en esos casos, nos basamos en garantías contractuales estándar." },
        { n: "06", title: "Conservación de los datos", body: "Conservamos tus datos de membresía mientras seas socia, y durante un periodo limitado tras tu baja para cumplir nuestras obligaciones contables y legales. Si tu solicitud queda en lista de espera o no es aceptada, la conservamos solo el tiempo necesario para considerarte en la siguiente Ventana, tras lo cual se elimina." },
        { n: "07", title: "Seguridad de los datos", body: "Limitamos el acceso a los datos de las socias al pequeño equipo que los necesita para gestionar el club, y trabajamos con proveedores que cumplen los estándares actuales de protección de datos. Ningún sistema es completamente inmune a los riesgos, pero tomamos medidas técnicas y organizativas razonables para proteger tus datos frente a pérdida o uso indebido." },
        { n: "08", title: "Tus derechos", body: "Conforme al RGPD, puedes solicitar acceder, corregir, eliminar o recibir una copia de tus datos, y puedes oponerte a determinados usos o solicitar que los restrinjamos. Para ejercer cualquiera de estos derechos, escribe a hello@themothers.cc. Si no estás satisfecha con nuestra respuesta, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es)." },
        { n: "09", title: "Cookies y almacenamiento local", body: "Este sitio web utiliza el almacenamiento local de tu navegador para recordar tu idioma preferido y, en el caso de las socias, para mantener tu sesión iniciada — no utilizamos cookies de publicidad o seguimiento de terceros." },
        { n: "10", title: "Cambios en esta política", body: "Podemos actualizar esta Política de Privacidad a medida que el club y sus herramientas evolucionan. Publicaremos cualquier cambio aquí con una fecha actualizada, y avisaremos por correo a las socias activas de cualquier cambio que afecte de forma relevante al tratamiento de sus datos." },
        { n: "11", title: "Contacto", body: "¿Preguntas sobre tus datos? Escríbenos a hello@themothers.cc." },
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
        <p style={{ fontSize: "19px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.78)", margin: 0, maxWidth: "56ch" }}>
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
            {isEn ? "Last updated 4 September 2026 · Barcelona, Spain" : "Última actualización: 4 de septiembre de 2026 · Barcelona, España"}
          </p>
          <p style={{ fontSize: "15.5px", lineHeight: 1.75, color: "rgba(57,41,42,0.78)", margin: 0, maxWidth: "48em", textWrap: "pretty" }}>
            {isEn
              ? "These Terms & Conditions govern your use of the themothers.cc website and your membership with The Mothers, a private membership club for mothers operating in Barcelona, Spain. By submitting an application, booking a place as a guest, or otherwise using this website, you agree to be bound by these Terms. If you don't agree, please don't use the site or services."
              : "Estos Términos y Condiciones regulan el uso del sitio themothers.cc y tu membresía con The Mothers, un club privado de membresía para madres que opera en Barcelona, España. Al enviar una solicitud, reservar una plaza como invitada o utilizar este sitio web, aceptas quedar vinculada por estos Términos. Si no estás de acuerdo, por favor no utilices el sitio ni los servicios."}
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
            {isEn ? "Last updated 4 September 2026 · Barcelona, Spain" : "Última actualización: 4 de septiembre de 2026 · Barcelona, España"}
          </p>
          <p style={{ fontSize: "15.5px", lineHeight: 1.75, color: "rgba(57,41,42,0.78)", margin: 0, maxWidth: "48em", textWrap: "pretty" }}>
            {isEn
              ? "This Privacy Policy explains how The Mothers collects, uses and protects your personal data when you apply for membership, book events, or use themothers.cc. The Mothers is the data controller for the personal data described here, and can be reached at hello@themothers.cc for any privacy question."
              : "Esta Política de Privacidad explica cómo The Mothers recopila, utiliza y protege tus datos personales cuando solicitas tu membresía, reservas eventos o utilizas themothers.cc. The Mothers es la responsable del tratamiento de los datos personales descritos aquí, y puedes contactarnos en hello@themothers.cc para cualquier consulta sobre privacidad."}
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
