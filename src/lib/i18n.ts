export type Locale = "en" | "es";

export const DICTIONARIES = {
  en: {
    nav: {
      home: "Home",
      membership: "Membership",
      events: "Events",
      journal: "Journal",
      partners: "Partners",
      ambassadors: "Godmothers",
      faq: "FAQ",
      applyBtn: "Join now",
      loginBtn: "Login",
      account: "My Account",
      logout: "Log Out",
    },
    hero: {
      kicker: "Private membership club · Barcelona",
      title: "Find your people. Build your circle.",
      subtitle:
        "A private club for mothers in Barcelona — from pregnancy through your child's school years. Meet women in the same season of life, at events built for this exact purpose.",
      ctaPrimary: "Join now",
      ctaWaitlist: "Join the waitlist",
      ctaSecondary: "See more details",
      windowNoteOpen:
        "Applications open one week a month. This Window is open now — the first 50 members get €29/month, locked for a year.",
      windowNoteClosed:
        "Applications open one week a month, and this Window has closed. Join the waitlist and we will write to you the day the next one opens.",
    },
    why: {
      kicker: "Why The Mothers",
      heading: "Being a mom is a part of it, not all of it.",
      body: "Modern motherhood can be isolating — especially if you've just moved to the city, had your first baby, or don't have family nearby. Free Facebook groups are noisy and unmoderated. Private coaches and doulas are excellent, but expensive and one-to-one. The Mothers sits in between: curated, safe, and social.",
      pillars: [
        {
          title: "By your stage",
          body: "Events grouped by stage — pregnancy through age ten.",
        },
        {
          title: "Vetted & safe",
          body: "Every member is reviewed before she joins. No selling, no judgment.",
        },
        {
          title: "Built to last",
          body: "Stay with us from bump to age ten — not just one season of motherhood.",
        },
      ],
    },
    how: {
      kicker: "How it works",
      heading: "Three steps to your circle.",
      steps: [
        {
          n: "01",
          title: "Apply",
          body: "A short application and a light screening step — enough to keep the space intentional.",
        },
        {
          n: "02",
          title: "Come along",
          body: "Book a walk, a play date, or a MoM's date near you — small rooms, so talking is easy.",
        },
        {
          n: "03",
          title: "Belong",
          body: "Keep showing up and the friendships form on their own — nobody is assigned to anybody.",
        },
      ],
    },
    membershipTeaser: {
      kicker: "Membership",
      heading: "The Circle",
      price: "From €29/month for Opening Circle members",
      priceSub: "Standard rate €39/month, or €99/quarter",
      spotsLabel: (remaining: number) => `Only ${remaining} Opening Circle spots left`,
      bullets: [
        "Private community & stage groups",
        "Included walks & park socials",
        "20 monthly credits toward experiences",
        "Partner discounts, priority booking",
      ],
      cta: "See full membership",
    },
    partners: {
      kicker: "Partner perks",
      heading: "Members save across Barcelona's best, all in one place.",
      body: "A curated network of specialists and spaces for every stage — one trusted partner per category, so recommendations stay honest.",
      umbrellas: [
        {
          title: "Wellness & Movement",
          body: "Prenatal & postnatal yoga, pelvic-floor physiotherapy",
        },
        {
          title: "Expert Care & Support",
          body: "Lactation consultants, postpartum doulas",
        },
        {
          title: "Baby & Child Activities",
          body: "Baby swim, sensory play, baby massage",
        },
        {
          title: "Places & Hospitality",
          body: "Family-friendly cafés and venues",
        },
        {
          title: "Brands & Retail",
          body: "Maternity and baby-gear discounts",
        },
      ],
      note: "Launch partners are announced as they join — one per specialty, always exclusive.",
    },
    closing: { heading: "Your circle is waiting.", cta: "Join now" },
    godmother: {
      kicker: "Godmother programme",
      heading: "Bring a friend, earn a month of credits.",
      body: "Members can become Godmothers: you get a personal referral code for the mothers already asking where you found your people. No selling, no quotas — just an honest recommendation, and credits when it turns into a membership.",
      cta: "See it in your account",
      ctaNote: "Open to members. Apply from your account — we read every application personally.",
      steps: [
        { n: "01", title: "Get your code", body: "Apply from your account. Approved Godmothers receive a personal code and a welcome call." },
        { n: "02", title: "Share it", body: "Hand it to the friend who keeps asking, or post about the walk you actually enjoyed." },
        { n: "03", title: "Earn 20 credits", body: "5 credits the moment she joins, 15 more at her third month — credits never cap, so nothing is lost." },
      ],
    },
    footer: {
      blurb:
        "A private membership club for mothers, from pregnancy through the school years.",
      explore: "Explore",
      contact: "Get in touch",
      legal: "Legal",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      ambassadors: "For Godmothers",
      partners: "For Partners",
      social: "Follow along on Instagram and TikTok.",
      tagline: "Barcelona · English & Español",
    },
  },
  es: {
    nav: {
      home: "Inicio",
      membership: "Membresía",
      events: "Eventos",
      journal: "Diario",
      partners: "Partners",
      ambassadors: "Madrinas",
      faq: "Preguntas",
      applyBtn: "Solicitar ahora",
      loginBtn: "Acceder",
      account: "Mi Cuenta",
      logout: "Salir",
    },
    hero: {
      kicker: "Club privado de membresía · Barcelona",
      title: "Encuentra a tu gente. Construye tu círculo.",
      subtitle:
        "Un club privado para madres en Barcelona, desde el embarazo hasta la etapa escolar. Conoce a mujeres en la misma etapa de vida, en encuentros pensados justo para eso.",
      ctaPrimary: "Únete ahora",
      ctaWaitlist: "Unirme a la lista de espera",
      ctaSecondary: "Ver más detalles",
      windowNoteOpen:
        "Las solicitudes se abren una semana al mes. Esta Ventana está abierta ahora — las primeras 50 socias pagan 29€/mes, fijo durante un año.",
      windowNoteClosed:
        "Las solicitudes se abren una semana al mes, y esta Ventana ya se ha cerrado. Únete a la lista de espera y te escribimos el día que se abra la siguiente.",
    },
    why: {
      kicker: "Por qué The Mothers",
      heading: "Ser madre es una parte, no todo lo que eres.",
      body: "La maternidad moderna puede ser aislante, sobre todo si acabas de mudarte a la ciudad, acabas de ser madre o no tienes familia cerca. Los grupos gratuitos de Facebook son ruidosos y sin moderación. Las doulas y asesoras privadas son excelentes, pero caras e individuales. The Mothers está en el medio: cuidado, seguro y social, con un precio pensado para una etapa en la que los ingresos suelen reducirse.",
      pillars: [
        {
          title: "Por tu etapa",
          body: "Encuentros agrupados por etapa, desde el embarazo hasta los diez años.",
        },
        {
          title: "Verificado y seguro",
          body: "Revisamos a cada socia antes de unirse. Sin ventas, sin juicios.",
        },
        {
          title: "Pensado para durar",
          body: "Quédate con nosotras desde la barriga hasta los diez años, no solo una etapa.",
        },
      ],
    },
    how: {
      kicker: "Cómo funciona",
      heading: "Tres pasos hacia tu círculo.",
      steps: [
        {
          n: "01",
          title: "Solicita",
          body: "Una solicitud breve y un paso de selección ligero — suficiente para mantener el espacio cuidado.",
        },
        {
          n: "02",
          title: "Ven a un encuentro",
          body: "Reserva un paseo, un play date o un MoM's date cerca de ti — grupos pequeños, para que hablar sea fácil.",
        },
        {
          n: "03",
          title: "Pertenece",
          body: "Sigue viniendo y las amistades se forman solas — aquí nadie asigna a nadie.",
        },
      ],
    },
    membershipTeaser: {
      kicker: "Membresía",
      heading: "The Circle",
      price: "Desde 29€/mes para socias del Opening Circle",
      priceSub: "Tarifa estándar 39€/mes, o 99€/trimestre",
      spotsLabel: (remaining: number) => `Solo quedan ${remaining} plazas del Opening Circle`,
      bullets: [
        "Comunidad privada y grupos por etapa",
        "Paseos y encuentros en el parque incluidos",
        "20 créditos mensuales para experiencias",
        "Descuentos de partners y reservas prioritarias",
      ],
      cta: "Ver la membresía completa",
    },
    partners: {
      kicker: "Ventajas de partners",
      heading: "Ahorra en lo mejor de Barcelona, todo en un solo lugar.",
      body: "Una red seleccionada de especialistas y espacios para cada etapa — un partner de confianza por categoría, para que las recomendaciones sigan siendo honestas.",
      umbrellas: [
        {
          title: "Bienestar y movimiento",
          body: "Yoga prenatal y posparto, fisioterapia de suelo pélvico",
        },
        {
          title: "Cuidado experto",
          body: "Asesoras de lactancia, doulas de posparto",
        },
        {
          title: "Actividades para el bebé",
          body: "Natación para bebés, estimulación sensorial, masaje infantil",
        },
        {
          title: "Lugares y hostelería",
          body: "Cafés y espacios acogedores para familias",
        },
        {
          title: "Marcas y retail",
          body: "Descuentos en maternidad y artículos para bebé",
        },
      ],
      note: "Los partners de lanzamiento se anuncian a medida que se incorporan: uno por especialidad, siempre exclusivo.",
    },
    closing: { heading: "Tu círculo te espera.", cta: "Únete ahora" },
    godmother: {
      kicker: "Programa de Madrinas",
      heading: "Trae a una amiga y gana un mes de créditos.",
      body: "Las socias pueden ser Madrinas: recibes un código personal para las madres que ya te preguntan dónde encontraste a tu gente. Sin vender nada y sin objetivos — solo una recomendación honesta, y créditos cuando se convierte en membresía.",
      cta: "Verlo en tu cuenta",
      ctaNote: "Solo para socias. Se solicita desde tu cuenta — leemos cada solicitud personalmente.",
      steps: [
        { n: "01", title: "Consigue tu código", body: "Solicítalo desde tu cuenta. Las Madrinas aprobadas reciben un código personal y una llamada de bienvenida." },
        { n: "02", title: "Compártelo", body: "Dáselo a la amiga que siempre pregunta, o cuenta el paseo que de verdad disfrutaste." },
        { n: "03", title: "Gana 20 créditos", body: "5 créditos cuando se une y 15 más a los tres meses — los créditos no tienen límite, así que nada se pierde." },
      ],
    },
    footer: {
      blurb:
        "Un club privado de membresía para madres, desde el embarazo hasta la etapa escolar.",
      explore: "Explorar",
      contact: "Contacto",
      legal: "Legal",
      terms: "Términos y Condiciones",
      privacy: "Política de Privacidad",
      ambassadors: "Para Madrinas",
      partners: "Para Partners",
      social: "Síguenos en Instagram y TikTok.",
      tagline: "Barcelona · Español & English",
    },
  },
};
