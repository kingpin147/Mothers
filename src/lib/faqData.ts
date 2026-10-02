export interface FaqItemData {
  group: string;
  note?: string;
  qEn: string;
  aEn: string;
  qEs: string;
  aEs: string;
}

export const FAQ_GROUPS = [
  "Coming to an event now",
  "Credits and your wallet",
  "Membership after launch",
  "The club itself",
] as const;

export type FaqGroupName = (typeof FAQ_GROUPS)[number];

export const FAQ_GROUP_NOTES: Record<string, { en: string; es: string }> = {
  "Coming to an event now": {
    en: "Everything on the calendar is open to everyone until membership opens.",
    es: "Todo el calendario está abierto a todas hasta la apertura de la membresía.",
  },
  "Credits and your wallet": {
    en: "One wallet, no subscription, nothing that renews.",
    es: "Un único monedero, sin suscripción ni cobros recurrentes.",
  },
  "Membership after launch": {
    en: "What is coming, and what it means for anyone who came early.",
    es: "Lo que viene y las ventajas para quienes nos acompañen desde el inicio.",
  },
  "The club itself": {
    en: "How it is run, and by whom.",
    es: "Cómo funciona el club y quién lo gestiona.",
  },
};

export const CANONICAL_FAQS: FaqItemData[] = [
  // 1. Coming to an event now
  {
    group: "Coming to an event now",
    qEn: "Do I have to be a member to come?",
    aEn: "No — there is no membership to be had yet. Pick an event and book it, or open a free account. Every card shows its price in credits — 0-credit events say “0 credits”.",
    qEs: "¿Tengo que ser socia para asistir?",
    aEs: "No — todavía no hay membresías a la venta. Elige un evento y resérvalo, o crea una cuenta gratuita. Cada ficha muestra su precio en créditos — los eventos de 0 créditos indican “0 créditos”.",
  },
  {
    group: "Coming to an event now",
    qEn: "Do I have to be a mother?",
    aEn: "Yes, and expecting counts. The Mothers is built for mothers, from the first trimester through your child’s school years. If motherhood is still ahead of you, join the letter and we will be here when it is not.",
    qEs: "¿Tengo que ser madre?",
    aEs: "Sí, y el embarazo cuenta. The Mothers está pensado para madres, desde el primer trimestre de gestación y durante los años de crianza. Si la maternidad aún está en tu horizonte futuro, únete a la carta y estaremos aquí cuando llegue el momento.",
  },
  {
    group: "Coming to an event now",
    qEn: "What does an event cost?",
    aEn: "Every card shows its price in credits — 0-credit events say “0 credits”, a hosted coffee or brunch is 1 credit, a class or an expert session 6 to 9, a supper 7 to 12, and a signature moment 16 to 28. After launch, each event has a member price and a non-member price, and cards show both.",
    qEs: "¿Cuánto cuesta un evento?",
    aEs: "Cada ficha muestra su precio en créditos — los eventos de 0 créditos indican “0 créditos”, un café o brunch con anfitriona cuesta 1 crédito, una clase o taller con especialista entre 6 y 9, una cena entre 7 y 12, y un Signature moment entre 16 y 28. Tras el lanzamiento, cada evento tendrá precio para socias y precio general.",
  },
  {
    group: "Coming to an event now",
    qEn: "Can I cancel?",
    aEn: "Yes. Each event has its own cancellation window, shown on the card and at booking — 0-credit events any time, hosted coffees 24 hours, classes and sessions 48 hours, suppers and signature moments 7 days. Cancel inside the window and your credits come straight back; after it, they return only if someone takes your place. Two no-shows in three months pause your booking until you write to us.",
    qEs: "¿Puedo cancelar mi reserva?",
    aEs: "Sí. Cada evento dispone de su propio plazo de cancelación indicado en la ficha y al reservar: eventos de 0 créditos en cualquier momento, cafés con anfitriona 24 horas, clases y talleres 48 horas, cenas y Signature moments 7 días. Si cancelas dentro del plazo, tus créditos vuelven íntegros de inmediato; fuera de plazo, solo si otra persona ocupa tu plaza. Dos ausencias en 3 meses pausan la posibilidad de reservar hasta que nos contactes.",
  },
  {
    group: "Coming to an event now",
    qEn: 'Why do some events say "gathering"?',
    aEn: "Some events carry a fixed cost to us — a speaker, a studio, a private room — so they need a minimum number of us to run. Those hold your credits rather than spending them, confirm about ten days ahead, and return everything in full if the evening does not go ahead.",
    qEs: '¿Por qué algunos eventos indican "reuniendo grupo"?',
    aEs: "Algunos eventos implican costes fijos comprometidos (un ponente, un estudio, una sala privada) y necesitan un mínimo de asistentes para celebrarse. En ellos los créditos quedan retenidos sin gastarse, se confirman unos diez días antes y se reembolsan íntegros si el encuentro no llegase a realizarse.",
  },
  {
    group: "Coming to an event now",
    qEn: "Can I bring my children?",
    aEn: "Every event is labelled clearly: children welcome, or mothers only. You always know before you book. Where an event is not childcare-provided, your child is your own to watch — which most of the walks and play dates assume anyway.",
    qEs: "¿Puedo llevar a mis hijos?",
    aEs: "Cada evento está claramente señalizado: niños bienvenidos o exclusivo para madres. Siempre lo sabrás antes de reservar. Salvo en eventos con servicio de cuidado infantil específico, cada madre supervisa a sus propios hijos.",
  },

  // 2. Credits and your wallet
  {
    group: "Credits and your wallet",
    qEn: "How do credits work?",
    aEn: "Credits are our currency. You add them in your account, in exactly the quantity you want, and they sit in your wallet until you spend them. Each credit expires six months after you buy it, and the oldest in your wallet are always spent first, so nothing is wasted by accident.",
    qEs: "¿Cómo funcionan los créditos?",
    aEs: "Los créditos son la moneda del club. Los adquieres en tu cuenta a 2€ cada uno, en la cantidad exacta que necesites, y permanecen en tu monedero hasta que los uses. Cada crédito caduca a los 6 meses de su compra y siempre se consumen primero los más antiguos para evitar pérdidas involuntarias.",
  },
  {
    group: "Credits and your wallet",
    qEn: "What if I am short at the moment of booking?",
    aEn: "Press book and we show you what the event costs, what you have, and the shortfall. Pay for the difference and the place is yours in the same step — you come straight back to the event you were looking at.",
    qEs: "¿Qué pasa si me faltan créditos al momento de reservar?",
    aEs: "Al pulsar en Reservar te mostramos el coste, tu saldo disponible y la diferencia restante. Abonas la diferencia con tarjeta y tu plaza queda confirmada en el mismo paso.",
  },
  {
    group: "Credits and your wallet",
    qEn: "How do I open an account?",
    aEn: "You can open a free account directly on the site — no booking needed. If you join before launch, there is no joining fee ever.",
    qEs: "¿Cómo creo una cuenta?",
    aEs: "Puedes crear una cuenta gratuita directamente en la web — sin necesidad de reservar. Si te unes antes del lanzamiento, nunca pagarás cuota de alta.",
  },
  {
    group: "Credits and your wallet",
    qEn: "What happens to my credits when membership launches?",
    aEn: "They stay yours, with their six-month life intact, and you can spend them down exactly as before. What changes is that new credits come with membership, so a wallet without one will not be topped up again.",
    qEs: "¿Qué pasará con mis créditos cuando se lance la membresía?",
    aEs: "Seguirán siendo tuyos con su período de validez de 6 meses íntegro y podrás utilizarlos exactamente igual. La diferencia tras el lanzamiento es que los nuevos créditos vendrán incluidos con la membresía.",
  },

  // 3. Membership after launch
  {
    group: "Membership after launch",
    qEn: "Why not sell memberships now?",
    aEn: "Because a membership is a promise about a calendar, a community and a partner list, and all three should be real before anyone pays monthly for them. Until then you pay for the event you come to, and nothing else.",
    qEs: "¿Por qué no vender membresías ahora?",
    aEs: "Porque una membresía es un compromiso sobre un calendario consolidado, una comunidad activa y una red de colaboradoras de confianza. Todo ello debe estar vivo y demostrado antes de cobrar cuotas periódicas. Hasta entonces solo abonas la experiencia a la que asistes.",
  },
  {
    group: "Membership after launch",
    qEn: "What will it cost?",
    aEn: "€39 a month or €99 every three months — one membership, one rate, two rhythms. Twenty credits are granted at the start of each month, so the calendar stays reachable all quarter rather than filling up in week one. Mothers who open an account before launch join without a joining fee.",
    qEs: "¿Cuánto costará la membresía?",
    aEs: "39€ al mes o 99€ cada tres meses: una sola membresía con dos ritmos de pago. Incluye 20 créditos mensuales. Todas las cuentas registradas antes del lanzamiento oficial disfrutarán de la exención de la cuota de inscripción.",
  },
  {
    group: "Membership after launch",
    qEn: "Can I still come without membership?",
    aEn: "Yes. Members and non-members book the same events with credits — non-members pay the non-member price. Some events with limited places open to members first, and to everyone else from a date shown on the card.",
    qEs: "¿Podré asistir a eventos sin ser socia tras el lanzamiento?",
    aEs: "Sí. Socias y no socias podrán reservar eventos con créditos: las no socias abonarán la tarifa general. Ciertos encuentros con aforo muy reducido abrirán primero para socias y posteriormente al público general.",
  },
  {
    group: "Membership after launch",
    qEn: "Am I first in line?",
    aEn: "Anyone who has booked an event before launch hears from us before membership opens publicly.",
    qEs: "¿Tendré prioridad para unirme?",
    aEs: "Cualquier madre que haya reservado un evento antes del lanzamiento oficial recibirá la invitación prioritaria antes de abrir las plazas al público.",
  },
  {
    group: "Membership after launch",
    qEn: "Will there still be free events?",
    aEn: "Walks and park socials stay free for members. Without membership you can still come to all of them, at a small non-member price in credits — every card shows both prices.",
    qEs: "¿Seguirá habiendo eventos gratuitos?",
    aEs: "Los paseos y encuentros en el parque seguirán siendo gratuitos e ilimitados para las socias. Sin membresía se podrá asistir con una pequeña aportación en créditos.",
  },

  // 4. The club itself
  {
    group: "The club itself",
    qEn: "Where do events happen?",
    aEn: "Across Barcelona — Gràcia, Eixample, Ciutat Vella, Sant Antoni, Sarrià and Les Corts so far, with a few things online. We publish the neighbourhood on the card and the exact address when you book.",
    qEs: "¿Dónde se celebran los eventos?",
    aEs: "Por toda Barcelona: Gràcia, Eixample, Ciutat Vella, Sant Antoni, Sarrià y Les Corts, además de algunos encuentros online. Indicamos el barrio en la ficha del evento y la dirección exacta al confirmar tu reserva.",
  },
  {
    group: "The club itself",
    qEn: "In which language?",
    aEn: "Bilingual from day one. Each event card says which languages the room will be speaking — usually Spanish and English, sometimes Catalan or French.",
    qEs: "¿En qué idioma se realizan los encuentros?",
    aEs: "Bilingüe desde el primer día. Cada evento indica los idiomas principales del encuentro (habitualmente español e inglés, y en ocasiones catalán o francés).",
  },
  {
    group: "The club itself",
    qEn: "What does a host do?",
    aEn: "A host welcomes the other mothers at an event on the calendar. She arrives 10 minutes early, says hello to everyone as they arrive and makes the introductions, so nobody stands alone.",
    qEs: "¿Qué hace una anfitriona (host)?",
    aEs: "La anfitriona da la bienvenida a las demás madres. Llega 10 minutos antes, recibe con calidez a cada asistente y dinamiza las presentaciones iniciales para que ninguna madre se sienta sola.",
  },
  {
    group: "The club itself",
    qEn: "Who can host, and how?",
    aEn: "Any mother who has been to at least 2 events, with no no-shows in the last 3 months. Some events are marked as needing a host: book it, then ask to host it on the Become a host page or in My Account → Hosting. The team confirms by email, with the meeting point and who is coming.",
    qEs: "¿Quién puede ser anfitriona y cómo solicitarlo?",
    aEs: "Cualquier madre que haya asistido al menos a 2 eventos y no tenga ausencias en los últimos 3 meses. En los eventos marcados como 'Necesita anfitriona', reserva tu plaza y solicita ser anfitriona desde la página 'Sé anfitriona' o desde Mi Cuenta → Anfitriona. El equipo te confirmará por correo.",
  },
  {
    group: "The club itself",
    qEn: "What do I earn as a host?",
    aEn: "2 credits each time, added once the event has run, plus 50% of your place back in credits. Credits last 6 months. If you cancel less than 48 hours before, or do not come, you can host again after attending three more events.",
    qEs: "¿Qué recibo por ser anfitriona?",
    aEs: "2 créditos una vez celebrado el evento más el 50% del coste de tu plaza devuelto en créditos. Tienen validez de 6 meses. Si cancelas con menos de 48h o no asistes, deberás asistir a 3 eventos más antes de volver a solicitarlo.",
  },
  {
    group: "The club itself",
    qEn: "What are the rules in La Gazette?",
    aEn: "Kindness first, no selling to other mothers, what is shared stays there, and advice from mothers is not medical advice. Anyone can read; you need an account to post. You can post anonymously, but every post stays linked to your account. Photos: up to 4, and no children other than your own unless you have their parent’s permission. Up to 5 posts and 20 replies a day. Report anything that breaks the rules — a host reads every report the same day.",
    qEs: "¿Cuáles son las normas en La Gazette?",
    aEs: "Amabilidad ante todo, sin prospección comercial ni venta, confidencialidad y recordando que las experiencias compartidas no constituyen consejo médico. Cualquiera puede leer; se necesita cuenta para publicar. Puedes publicar de forma anónima pero queda vinculada internamente a tu cuenta. Máximo 4 fotos sin mostrar menores ajenos sin permiso. Hasta 5 publicaciones y 20 respuestas diarias.",
  },
  {
    group: "The club itself",
    qEn: "Who are the partners?",
    aEn: "One trusted specialist per category — a yoga studio, a sleep consultancy, a lactation service, a career coach, the places we book again and again. They run the sessions, and after launch members get standing offers with them.",
    qEs: "¿Quiénes son los partners colaboradores?",
    aEs: "Un colaborador especialista de referencia por categoría: estudios de yoga, asesoría de sueño, consultoría de lactancia, coaches profesionales. Imparten las sesiones y tras el lanzamiento ofrecerán ventajas exclusivas a las socias.",
  },
  {
    group: "The club itself",
    qEn: "How do you keep the room safe?",
    aEn: "Small rooms, a host at many events, a clear rule against selling to other mothers, and the ability to remove anyone who breaks it. When membership opens there is a light screening step on top of that.",
    qEs: "¿Cómo se mantiene un entorno seguro y de confianza?",
    aEs: "Grupos reducidos, presencia de anfitrionas en los eventos, prohibición expresa de venta directa y moderación activa con derecho de admisión ante cualquier incumplimiento.",
  },
];
