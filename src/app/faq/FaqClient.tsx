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
    aEn: "We don't accept members on a rolling basis. A Window opens once a month and stays open for one week only; everyone accepted in that Window joins on the same day, so nobody joins alone. If you find us mid-month, leave your name and we'll write to you the day the next Window opens.",
    qEs: "¿Qué es una Ventana de membresía?",
    aEs: "No aceptamos socias de forma continua. Cada mes se abre una Ventana y permanece abierta una sola semana; todas las aceptadas en esa Ventana entran el mismo día, así que nadie se une sola. Si nos encuentras a mitad de mes, déjanos tu nombre y te escribimos el día que se abra la siguiente.",
  },
  {
    qEn: "What if I'm not accepted right away?",
    aEn: "Outside a Window, your application joins our waitlist and is reviewed at the next opening.",
    qEs: "¿Y si no me aceptan de inmediato?",
    aEs: "Fuera de una Ventana, tu solicitud pasa a nuestra lista de espera y se revisa en la próxima apertura.",
  },
  {
    qEn: "What if no Window is open right now?",
    aEn: "Then you can't apply yet — and rather than take an application we cannot review, we take your name for the waitlist. You'll hear from us the day the next Window opens, before it is announced anywhere else. Meanwhile the walks and park socials stay free and open to you, and an Event Pass gets you into one paid event.",
    qEs: "¿Y si ahora no hay ninguna Ventana abierta?",
    aEs: "Entonces todavía no puedes solicitar plaza — y en lugar de recoger una solicitud que no podemos revisar, apuntamos tu nombre en la lista de espera. Te escribiremos el día que se abra la próxima Ventana, antes de anunciarlo en cualquier otro sitio. Mientras tanto, los paseos y encuentros en el parque siguen siendo gratuitos y abiertos para ti, y puedes conseguir un Event Pass para un evento de pago.",
  },
  {
    qEn: "Do I have to be a mother to join?",
    aEn: "Yes. The Mothers is built for mothers, and expecting counts — if you are pregnant, apply. Membership, guest places and paid events are for mothers only; our walks and park socials are open on the same basis. If motherhood is still ahead of you, join the Letter and we'll be here when it isn't.",
    qEs: "¿Tengo que ser madre para unirme?",
    aEs: "Sí. The Mothers está hecho para madres, y el embarazo cuenta — si estás embarazada, apúntate. La membresía, los Event Pass y los eventos de pago son solo para madres; nuestros paseos y encuentros en el parque están abiertos en las mismas condiciones. Si la maternidad está todavía por delante, únete a la Carta y estaremos aquí cuando deje de estarlo.",
  },
  {
    qEn: "Which stage group will I be in?",
    aEn: "Five groups, by where you are right now: Pregnant (from your first trimester until birth), Babies (0–12 months), Toddlers (1–3 years), Children (3–6 years) and Big kids (6–10 years). Your group follows your child's age, so it changes as she grows.",
    qEs: "¿En qué grupo de etapa estaré?",
    aEs: "Cinco grupos, según el momento en el que estás: Embarazo (desde el primer trimestre hasta el parto), Bebés (0–12 meses), Peques (1–3 años), Niños (3–6 años) y Niños grandes (6–10 años). Tu grupo va con la edad de tu hija, así que cambia a medida que crece.",
  },
  {
    qEn: "What are credits, and how do they work?",
    aEn: "Every month you get {{monthlyGrant}} credits to spend across the calendar — walks and park socials are always free and unlimited. Unused credits roll over with {{rolloverCapText}}, and each credit expires 6 months after it's issued, oldest first, so a rollover credit is always used before a fresh one. Save three quiet months and a Signature moment is within reach. We'll email you a reminder about 30 days before any credit is due to expire, so nothing lapses as a surprise.",
    qEs: "¿Qué son los créditos y cómo funcionan?",
    aEs: "Cada mes recibes {{monthlyGrant}} créditos para usar en el calendario — los paseos y encuentros en el parque son siempre gratuitos e ilimitados. Los créditos no usados se acumulan {{rolloverCapTextEs}}, y cada crédito caduca 6 meses después de emitirse, empezando por los más antiguos, así que un crédito acumulado siempre se usa antes que uno nuevo. Ahorra tres meses tranquilos y un Signature moment queda a tu alcance. Te avisaremos por correo unos 30 días antes de que caduque cualquier crédito, para que nunca sea una sorpresa.",
  },
  {
    qEn: "Can I buy extra credits?",
    aEn: "Yes — anytime, at a flat €1 per credit, in exactly the amount you need. Extra credits join your balance under the same rules as monthly credits: 6-month expiry, oldest credits used first.",
    qEs: "¿Puedo comprar créditos extra?",
    aEs: "Sí — en cualquier momento, a un precio fijo de 1€ por crédito, en la cantidad exacta que necesites. Los créditos extra se suman a tu saldo con las mismas reglas que los mensuales: caducan a los 6 meses y se usan primero los más antiguos.",
  },
  {
    qEn: "What if I run out of credits mid-month?",
    aEn: "Nothing is lost — you just top up at the moment you book. Press Book on an event you cannot yet afford and we show you exactly what it costs, what you have, and the shortfall, priced at €1 per credit. Pay for the difference and the place is yours in the same step. On an event still gathering the members it needs, those credits are held rather than spent, and they come back in full if it does not go ahead. If you would rather wait, your monthly credits renew on your billing date.",
    qEs: "¿Y si me quedo sin créditos a mitad de mes?",
    aEs: "No se pierde nada — añades créditos en el mismo momento de reservar. Pulsa Reservar en un evento que aún no puedas pagar y te mostramos lo que cuesta, lo que tienes y la diferencia, a 1€ por crédito. Paga esa diferencia y la plaza es tuya en el mismo paso. En un evento que aún reúne el mínimo de socias, esos créditos se guardan en lugar de gastarse, y vuelven íntegros si no se celebra. Si prefieres esperar, tus créditos se renuevan en tu fecha de facturación.",
  },
  {
    qEn: "Do all events have limited places?",
    aEn: "Most do, and the card says how many are left against the total — \"Places left: 6 of 16\" — so you can see at a glance how full a room is. Some walks and park socials carry no limit at all; those read \"Open list — no limit on places\", and leaving your details puts you on the list straight away with nothing to wait for. Where places are limited on a free event, members are held ahead of the open list, and the list is confirmed three days before.",
    qEs: "¿Todos los eventos tienen plazas limitadas?",
    aEs: "Casi todos, y la tarjeta indica cuántas quedan sobre el total — \"Plazas libres: 6 de 16\" — para que veas de un vistazo cómo está la sala. Algunos paseos y encuentros en el parque no tienen límite; esos indican \"Lista abierta — plazas sin límite\", y al dejar tus datos entras en la lista al instante. Cuando un evento gratuito sí tiene límite, las socias van por delante de la lista abierta, que se confirma tres días antes.",
  },
  {
    qEn: "How does the Godmother referral work?",
    aEn: "Every Godmother has a personal referral code. A mother adds it to her application, and once she joins you earn {{referralBonus}} credits — plus {{threeMonthBonus}} more when she reaches three months. Bonus credits follow the same 6-month expiry as the rest.",
    qEs: "¿Cómo funciona el referido de Madrina?",
    aEs: "Cada Madrina tiene un código de referido personal. Una madre lo añade en su solicitud y, cuando se une, ganas {{referralBonus}} créditos — más {{threeMonthBonus}} cuando ella cumple tres meses. Los créditos extra son créditos normales: no hay ningún límite de acumulación y caducan a los 6 meses, como el resto.",
  },
  {
    qEn: "Can I come to an event without being a member?",
    aEn: "Yes. An Event Pass is €35 and books you one place at any event worth up to 18 credits. Each event holds a small number of guest places — usually two. Most of the calendar sits under that; the event card tells you whether a pass can book it. Everyone gets two passes in total — enough to know whether this is your room — and after that it's membership. Only Signature moments, and anything above 18 credits, stay with members. If you join within thirty days of the event, your €35 comes off your membership — €13 to join instead of €48 at the Opening Circle rate, or €23 instead of €58 at the standard rate. It comes off your first payment only; after that you pay your normal monthly rate. Your receipt is your ticket — it carries the meeting point and a link to release your place if your plans change. The €35 is not refunded, but the seat goes to another mother. Walks and park socials are always free, no booking fee at all.",
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
    qEn: "What happens when my Opening Circle rate ends?",
    aEn: "Opening Circle members keep €29/month for a full 12 months. We'll remind you before it changes, and you'll never be surprised on your statement. The rate is tied to staying a member: pausing protects it, but cancelling ends it — rejoin later and you rejoin at the standard rate.",
    qEs: "¿Qué pasa cuando termina mi tarifa de Opening Circle?",
    aEs: "Las socias del Opening Circle mantienen 29€/mes durante 12 meses completos. Te avisaremos antes de que cambie, y nunca será una sorpresa en tu extracto. La tarifa va unida a seguir siendo socia: pausar la protege, pero cancelar la termina — si vuelves más adelante, entras a la tarifa estándar.",
  },
  {
    qEn: "Can I join if my child is already in school?",
    aEn: "Yes — The Mothers is open from pregnancy through age ten, not just the newborn years.",
    qEs: "¿Puedo unirme si mi hijo/a ya está en el colegio?",
    aEs: "Sí — The Mothers está abierto desde el embarazo hasta los diez años, no solo la etapa de recién nacido.",
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
  },
  {
    qEn: "Do you operate in English and Spanish?",
    aEn: "Yes — The Mothers is bilingual from day one, for local and international mothers alike.",
    qEs: "¿Operáis en inglés y en español?",
    aEs: "Sí — The Mothers es bilingüe desde el primer día, tanto para madres locales como internacionales.",
  }
];

interface FaqClientProps {
  dynamicFaqs: FaqEntry[];
  publicSettings?: any;
}

export default function FaqClient({ dynamicFaqs = [], publicSettings = {} }: FaqClientProps) {
  const [lang, setLang] = useState<Locale>("en");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const processText = (text: string) => {
    let t = text;
    t = t.replace(/\{\{monthlyGrant\}\}/g, String(publicSettings?.monthlyGrantCredits ?? 20));
    t = t.replace(/\{\{referralBonus\}\}/g, String(publicSettings?.referralBonusCredits ?? 5));
    t = t.replace(/\{\{threeMonthBonus\}\}/g, String(publicSettings?.godmotherThreeMonthBonus ?? 15));
    
    const rolloverCap = publicSettings?.rolloverCapCredits ?? 0;
    const rolloverCapText = rolloverCap === 0 ? "no ceiling" : `a ceiling of ${rolloverCap}`;
    const rolloverCapTextEs = rolloverCap === 0 ? "sin límite" : `con un límite de ${rolloverCap}`;
    t = t.replace(/\{\{rolloverCapText\}\}/g, rolloverCapText);
    t = t.replace(/\{\{rolloverCapTextEs\}\}/g, rolloverCapTextEs);
    return t;
  };

  const processedList = FAQ_LIST.map((f) => ({
    qEn: f.qEn,
    aEn: processText(f.aEn),
    qEs: f.qEs,
    aEs: processText(f.aEs)
  }));

  const allFaqs = [...processedList, ...dynamicFaqs];

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
          {[...dynamicFaqs, ...FAQ_LIST].map((faq, idx) => {
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
              ? "Try an Event Pass: experience the community, no membership needed."
              : "Prueba un Event Pass: vive la comunidad, sin necesidad de membresía."}
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
