"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

interface FaqEntry {
  qEn: string;
  aEn: string;
  qEs: string;
  aEs: string;
}

const FAQ_LIST: FaqEntry[] = [
  {
    qEn: "What is a Membership Window?",
    aEn: "We don't accept members on a rolling basis. Applications open for a few weeks at a time; everyone accepted in that Window joins on the same day, so nobody joins alone.",
    qEs: "¿Qué es una Ventana de membresía?",
    aEs: "No aceptamos socias de forma continua. Las solicitudes se abren durante unas semanas; todas las aceptadas en esa Ventana entran el mismo día, así que nadie se une sola.",
  },
  {
    qEn: "Do I have to be a mother to join?",
    aEn: "Yes. The Mothers is built for mothers, and expecting counts — if you are pregnant, apply. Membership, guest places and paid events are for mothers only; our walks and park socials are open on the same basis. If motherhood is still ahead of you, join the Letter and we'll be here when it isn't.",
    qEs: "¿Tengo que ser madre para unirme?",
    aEs: "Sí. The Mothers está hecho para madres, y el embarazo cuenta — si estás embarazada, apúntate. La membresía, los Event Pass y los eventos de pago son solo para madres; nuestros paseos y encuentros en el parque están abiertos en las mismas condiciones. Si la maternidad está todavía por delante, únete a la Carta y estaremos aquí cuando deje de estarlo.",
  },
  {
    qEn: "What are credits, and how do they work?",
    aEn: "Every month you get 20 credits to spend across the calendar — walks and park socials are always free and unlimited. Unused subscription credits roll over up to a 40-credit balance cap, and each credit expires 6 months after it's issued, oldest first. Bonus referral credits sit outside that cap.",
    qEs: "¿Qué son los créditos y cómo funcionan?",
    aEs: "Cada mes recibes 20 créditos para usar en el calendario — los paseos y encuentros en el parque son siempre gratuitos e ilimitados. Los créditos de suscripción no usados se acumulan hasta un saldo máximo de 40, y cada crédito caduca a los 6 meses, empezando por los más antiguos. Los créditos de referidos quedan fuera de ese límite.",
  },
  {
    qEn: "Can I buy extra credits?",
    aEn: "Yes — anytime, at a flat €1 per credit, in exactly the amount you need. Extra credits join your balance under the same rules as monthly credits: 6-month expiry, oldest credits used first.",
    qEs: "¿Puedo comprar créditos extra?",
    aEs: "Sí — en cualquier momento, a un precio fijo de 1€ por crédito, en la cantidad exacta que necesites. Los créditos extra se suman a tu saldo con las mismas reglas que los mensuales: caducan a los 6 meses y se usan primero los más antiguos.",
  },
  {
    qEn: "How does the Godmother referral work?",
    aEn: "Every Godmother has a personal referral code. A mother adds it to her application, and once she joins you earn 5 credits — plus 15 more when she reaches three months. Bonus credits sit outside the 40-credit balance cap and follow the same 6-month expiry as the rest.",
    qEs: "¿Cómo funciona el referido de Madrina?",
    aEs: "Cada Madrina tiene un código de referido personal. Una madre lo añade en su solicitud y, cuando se une, ganas 5 créditos — más 15 cuando ella cumple tres meses. Los créditos extra son créditos normales: no hay ningún límite de acumulación y caducan a los 6 meses, como el resto.",
  },
  {
    qEn: "Can I come to an event without being a member?",
    aEn: "Yes. An Event Pass is €35 and books you one place at any event worth up to 18 credits, capped at two guests per event. Most of the calendar sits under that; the event card tells you whether a pass can book it. Everyone gets two passes in total — enough to know whether this is your room — and after that it's membership. Only Signature moments, and anything above 18 credits, stay with members. If you join within thirty days of the event, your €35 comes off your membership — €13 to join instead of €48 at the Opening Circle rate, or €23 instead of €58 at the standard rate. It comes off your first payment only; after that you pay your normal monthly rate. Your receipt is your ticket — it carries the meeting point and a link to release your place if your plans change. The €35 is not refunded, but the seat goes to another mother. Walks and park socials are always free, no booking fee at all.",
    qEs: "¿Puedo asistir a un evento sin ser socia?",
    aEs: "Sí. Un Event Pass cuesta 35€ y te reserva una plaza en cualquier evento de hasta 18 créditos, con un máximo de dos invitadas por evento. La mayor parte del calendario está por debajo; la tarjeta del evento indica si un pase puede reservarlo. Cada persona tiene dos pases en total, y después toca la membresía. Solo los Signature moments, y lo que supere los 18 créditos, quedan para socias. Si te unes dentro de los treinta días siguientes al evento, tus 35€ se descuentan de tu primer pago: 13€ en lugar de 48€ con la tarifa Opening Circle, o 23€ en lugar de 58€ con la tarifa estándar. Solo se aplica al primer pago; después pagas tu tarifa mensual habitual. Tu recibo es tu entrada: lleva el punto de encuentro y un enlace para liberar tu plaza si te cambian los planes. Los 35€ no se devuelven, pero la plaza pasa a otra madre. Los paseos y encuentros en el parque son siempre gratuitos.",
  },
  {
    qEn: "Can I pay every three months instead?",
    aEn: "Yes, and it costs a little less. Opening Circle is €29 a month or €79 every three months; standard membership is €39 a month or €99 every three months. You choose when you apply, and you can switch at your next renewal. Your credits arrive the same way either way — 20 at the start of each month, not 60 in one go, so the calendar stays reachable all quarter rather than filling up in week one.",
    qEs: "¿Puedo pagar cada tres meses?",
    aEs: "Sí, y sale algo más económico. Opening Circle son 29€ al mes u 79€ cada tres meses; la membresía estándar son 39€ al mes o 99€ cada tres meses. Lo eliges al solicitar tu plaza y puedes cambiarlo en tu siguiente renovación. Tus créditos llegan igual en ambos casos: 20 al inicio de cada mes, no 60 de golpe, para que el calendario siga a tu alcance todo el trimestre en lugar de llenarse la primera semana.",
  },
  {
    qEn: "Can I pause or cancel my membership?",
    aEn: "Yes. Pause for up to two months a year at no cost, and cancel anytime — there is never a cancellation fee. Your credit expiry clock pauses too, so you never lose credits while stepped away. If you are an Opening Circle member, note the difference between the two: a pause keeps your €29 rate, cancelling releases it, and rejoining later is at the standard rate.",
    qEs: "¿Puedo pausar o cancelar mi membresía?",
    aEs: "Sí. Puedes pausarla hasta dos meses al año sin coste, y cancelar en cualquier momento — nunca hay cuota de cancelación. El reloj de caducidad de tus créditos también se pausa, así que nunca pierdes créditos mientras estás fuera. Si eres socia del Opening Circle, la diferencia importa: pausar conserva tu tarifa de 29€, cancelar la libera, y volver más adelante sería a la tarifa estándar.",
  },
  {
    qEn: "Can I cancel an event I booked?",
    aEn: "Yes, up to 24 hours before it starts — the credit is returned automatically, no explanation needed. Inside 24 hours we still return the credit if someone on the waitlist takes your place; if the place goes unfilled, the credit is spent. Booked with an Event Pass instead? Use the link in your receipt email, or write to hello@themothers.cc.",
    qEs: "¿Puedo cancelar un evento que reservé?",
    aEs: "Sí, hasta 24 horas antes de que empiece — el crédito se devuelve automáticamente, sin necesidad de explicación. Con menos de 24 horas también te devolvemos el crédito si alguien de la lista de espera ocupa tu plaza; si queda vacía, el crédito se pierde. ¿Reservaste como invitada? Usa el enlace de cancelación de tu correo de confirmación, o escribe a hello@themothers.cc.",
  },
  {
    qEn: "Why do some events say \"3 more to confirm\"?",
    aEn: "Some events carry a fixed cost to us — a speaker, a studio, a private room — so they need a minimum number of us to work. Those events open for reservations and confirm once they reach it — usually ten days before, so you have time to arrange childcare. Your credits are held, not spent, until it is confirmed; if the date moves, your place moves with it.",
    qEs: "¿Por qué algunos eventos dicen \"faltan 3 para confirmarlo\"?",
    aEs: "Algunos eventos tienen un coste fijo para nosotras — una ponente, un estudio, una sala privada — así que necesitan un mínimo de asistentes para funcionar. Esos eventos se abren a reservas y se confirman al alcanzarlo — normalmente diez días antes, para que tengas tiempo de organizarte. Tus créditos quedan retenidos, no gastados, hasta que se confirme; y si cambia la fecha, tu plaza va contigo.",
  },
  {
    qEn: "What happens if I miss an event I booked?",
    aEn: "Life happens — cancel whenever you can and the place goes to the waitlist. But two no-shows within three months pause your RSVPs until you write to us, so places stay available to members who will use them.",
    qEs: "¿Y si no puedo ir a un evento que reservé?",
    aEs: "La vida pasa — cancela en cuanto puedas y la plaza pasa a la lista de espera. Pero dos ausencias sin avisar en tres meses pausan tus reservas hasta que nos escribas, para que las plazas queden para socias que vayan a usarlas.",
  },
  {
    qEn: "How are members vetted?",
    aEn: "A short application plus a light screening step — enough to keep the space safe and intentional, without making it slow or exclusionary.",
    qEs: "¿Cómo se revisa a las socias?",
    aEs: "Una solicitud breve más un paso de selección ligero — suficiente para mantener el espacio seguro e intencional, sin que sea lento ni excluyente.",
  },
  {
    qEn: "What about childcare at events?",
    aEn: "Every event is labelled clearly: child-inclusive, on-site childcare provided, or adults-only. You always know before you book.",
    qEs: "¿Qué pasa con el cuidado de los niños en los eventos?",
    aEs: "Cada evento está etiquetado con claridad: con niños, con cuidado infantil in situ, o solo para adultas. Siempre lo sabrás antes de reservar.",
  }
];

export default function FaqPage() {
  const [lang, setLang] = useState<Locale>("en");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const toggleAccordion = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "12px"
          }}>
            {lang === "en" ? "FAQ" : "Preguntas frecuentes"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 52px)", lineHeight: 1.1, marginBottom: "16px" }}>
            {lang === "en" ? "You wonder, we answer." : "Todas tus preguntas, respondidas."}
          </h1>
          <p style={{ fontSize: "16px", color: "var(--color-text-muted)", maxWidth: "560px", margin: "0 auto" }}>
            {lang === "en"
              ? "Everything you're wondering before you apply."
              : "Todo lo que quieres saber antes de solicitar tu lugar."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                style={{
                  borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
                  padding: "6px 0"
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    padding: "18px 2px",
                    cursor: "pointer",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "18px",
                    color: "var(--color-text)",
                    minHeight: "44px"
                  }}
                >
                  <span>{lang === "en" ? faq.qEn : faq.qEs}</span>
                  <span style={{
                    flex: "none",
                    color: "var(--color-accent)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <p style={{
                    fontSize: "15px",
                    lineHeight: "1.65",
                    color: "rgba(57, 41, 42, 0.75)",
                    margin: "0 0 20px 0",
                    paddingRight: "28px"
                  }}>
                    {lang === "en" ? faq.aEn : faq.aEs}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(57, 41, 42, 0.6)", marginTop: "36px" }}>
          {lang === "en" ? "Looking for the legal details?" : "¿Buscas la información legal?"}{" "}
          <Link href="/terms" style={{ color: "var(--color-accent)", fontWeight: 500 }}>
            {lang === "en" ? "Terms & Conditions" : "Términos y Condiciones"}
          </Link>
          {" · "}
          <Link href="/privacy" style={{ color: "var(--color-accent)", fontWeight: 500 }}>
            {lang === "en" ? "Privacy Policy" : "Política de Privacidad"}
          </Link>
        </p>

        {/* Closing CTA */}
        <div style={{
          backgroundColor: "#39292a",
          color: "#f8efe2",
          borderRadius: "8px",
          padding: "clamp(36px, 5vw, 48px) 24px",
          textAlign: "center",
          marginTop: "48px"
        }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 4vw, 36px)", margin: "0 0 12px 0", color: "#f8efe2" }}>
            {lang === "en" ? "Still hesitating?" : "¿Todavía dudas?"}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(248, 239, 226, 0.75)", margin: "0 auto 24px auto", maxWidth: "480px" }}>
            {lang === "en"
              ? "Try one Open Event: experience the community, no membership needed."
              : "Prueba un Evento Abierto: vive la comunidad, sin necesidad de membresía."}
          </p>
          <Link
            href="/membership"
            style={{
              display: "inline-block",
              border: "1px solid #f8efe2",
              color: "#f8efe2",
              padding: "12px 28px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14.5px",
              textDecoration: "none"
            }}
          >
            {lang === "en" ? "Join now" : "Únete ahora"}
          </Link>
        </div>
      </div>
    </div>
  );
}
