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
      kicker: "Private membership club Â· Barcelona",
      title: "Find your people. Build your circle.",
      subtitle:
        "A private club for mothers in Barcelona â€” from pregnancy through your child's school years. Meet women in the same season of life, at events built for this exact purpose.",
      ctaPrimary: "Join now",
      ctaWaitlist: "Join the waitlist",
      ctaSecondary: "See more details",
      windowNoteOpen:
        "Applications open one week a month. This Window is open now â€” and our first 50 members join with no joining fee.",
      windowNoteClosed:
        "Applications open one week a month, and this Window has closed. Join the waitlist and we will write to you the day the next one opens.",
    },
    why: {
      kicker: "Why The Mothers",
      heading: "Being a mom is a part of it, not all of it.",
      body: "Modern motherhood can be isolating â€” especially if you've just moved to the city, had your first baby, or don't have family nearby. The Mothers offers a space for mothers to connect and build long-lasting friendships. It sits in between: curated, safe, and social.",
      pillars: [
        {
          title: "By your stage",
          body: "Events grouped by stage â€” from pregnancy through age ten.",
        },
        {
          title: "Vetted & safe",
          body: "Every member is reviewed before she joins. No selling, no judgment.",
        },
        {
          title: "Built to last",
          body: "Stay with us from bump to age ten â€” not just one season of motherhood.",
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
          body: "A short application and a light screening step â€” enough to keep the space intentional.",
        },
        {
          n: "02",
          title: "Come along",
          body: "Book a walk, a play date, or a MoM's date near you â€” small rooms, so talking is easy.",
        },
        {
          n: "03",
          title: "Belong",
          body: "Keep showing up and the friendships form on their own â€” nobody is assigned to anybody.",
        },
      ],
    },
    membershipTeaser: {
      kicker: "Membership",
      heading: "One membership",
      price: "â‚¬39/month",
      priceSub: "or â‚¬99 every 3 months Â· no joining fee for our first 50 members",
      spotsLabel: (remaining: number) => `Only ${remaining} places left in this Window`,
      bullets: [
        "Private community & stage groups",
        "Included Easy connection",
        "20 monthly credits toward experiences",
        "Partner discounts, priority booking",
      ],
      cta: "See full membership",
    },
    partners: {
      kicker: "Partner perks",
      heading: "Members save across Barcelona's best, all in one place.",
      body: "A curated network of specialists and spaces for every stage â€” one trusted partner per category, so recommendations stay honest.",
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
          body: "Family-friendly cafÃ©s and venues",
        },
        {
          title: "Brands & Retail",
          body: "Maternity and baby-gear discounts",
        },
      ],
      note: "Launch partners are announced as they join.",
    },
    closing: { heading: "Your circle is waiting.", cta: "Join now" },
    godmother: {
      kicker: "Godmother programme",
      heading: "Bring a friend, earn a month of credits.",
      body: "Every member is a Godmother from day one: your personal referral code is already in your account, for the mothers who keep asking where you found your people. No selling, no quotas â€” just an honest recommendation, and credits when it turns into a membership.",
      cta: "See it in your account",
      ctaNote: "No application, no approval â€” your code is waiting in your account.",
      steps: [
        { n: "01", title: "Find your code", body: "It is already in your account the day you join â€” nothing to apply for." },
        { n: "02", title: "Share it", body: "Hand it to the friend who keeps asking, or post about the walk you actually enjoyed." },
        { n: "03", title: "Earn 20 credits", body: "5 credits the moment she joins, 15 more at her third month â€” credits never cap, so nothing is lost." },
      ],
    },
    footer: {
      blurb:
        "A way of life for the modern Mother.",
      explore: "Explore",
      contact: "Get in touch",
      legal: "Legal",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      ambassadors: "For Godmothers",
      partners: "For Partners",
      social: "Follow along on Instagram and TikTok.",
      tagline: "Barcelona Â· English & EspaÃ±ol",
    },
  },
  es: {
    nav: {
      home: "Inicio",
      membership: "MembresÃ­a",
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
      kicker: "Club privado de membresÃ­a Â· Barcelona",
      title: "Encuentra a tu gente. Construye tu cÃ­rculo.",
      subtitle:
        "Un club privado para madres en Barcelona, desde el embarazo hasta la etapa escolar. Conoce a mujeres en la misma etapa de vida, en encuentros pensados justo para eso.",
      ctaPrimary: "Ãšnete ahora",
      ctaWaitlist: "Unirme a la lista de espera",
      ctaSecondary: "Ver mÃ¡s detalles",
      windowNoteOpen:
        "Las solicitudes se abren una semana al mes. Esta Ventana estÃ¡ abierta ahora â€” y nuestras primeras 50 socias entran sin cuota de inscripciÃ³n.",
      windowNoteClosed:
        "Las solicitudes se abren una semana al mes, y esta Ventana ya se ha cerrado. Ãšnete a la lista de espera y te escribimos el dÃ­a que se abra la siguiente.",
    },
    why: {
      kicker: "Por quÃ© The Mothers",
      heading: "Ser madre es una parte, no todo lo que eres.",
      body: "La maternidad moderna puede ser aislante, sobre todo si acabas de mudarte a la ciudad, acabas de ser madre o no tienes familia cerca. The Mothers ofrece un espacio para que las madres conecten y construyan amistades duraderas. EstÃ¡ en el punto medio: cuidado, seguro y social.",
      pillars: [
        {
          title: "Por tu etapa",
          body: "Encuentros agrupados por etapa, desde el embarazo hasta los diez aÃ±os.",
        },
        {
          title: "Verificado y seguro",
          body: "Revisamos a cada socia antes de unirse. Sin ventas, sin juicios.",
        },
        {
          title: "Pensado para durar",
          body: "QuÃ©date con nosotras desde la barriga hasta los diez aÃ±os, no solo una etapa.",
        },
      ],
    },
    how: {
      kicker: "CÃ³mo funciona",
      heading: "Tres pasos hacia tu cÃ­rculo.",
      steps: [
        {
          n: "01",
          title: "Solicita",
          body: "Una solicitud breve y un paso de selecciÃ³n ligero â€” suficiente para mantener el espacio cuidado.",
        },
        {
          n: "02",
          title: "Ven a un encuentro",
          body: "Reserva un paseo, un play date o un MoM's date cerca de ti â€” grupos pequeÃ±os, para que hablar sea fÃ¡cil.",
        },
        {
          n: "03",
          title: "Pertenece",
          body: "Sigue viniendo y las amistades se forman solas â€” aquÃ­ nadie asigna a nadie.",
        },
      ],
    },
    membershipTeaser: {
      kicker: "MembresÃ­a",
      heading: "Una sola membresÃ­a",
      price: "39â‚¬/mes",
      priceSub: "o 99â‚¬ cada 3 meses Â· sin cuota de inscripciÃ³n para nuestras primeras 50 socias",
      spotsLabel: (remaining: number) => `Solo quedan ${remaining} plazas en esta Ventana`,
      bullets: [
        "Comunidad privada y grupos por etapa",
        "Paseos y encuentros en el parque incluidos",
        "20 crÃ©ditos mensuales para experiencias",
        "Descuentos de partners y reservas prioritarias",
      ],
      cta: "Ver la membresÃ­a completa",
    },
    partners: {
      kicker: "Ventajas de partners",
      heading: "Ahorra en lo mejor de Barcelona, todo en un solo lugar.",
      body: "Una red seleccionada de especialistas y espacios para cada etapa â€” un partner de confianza por categorÃ­a, para que las recomendaciones sigan siendo honestas.",
      umbrellas: [
        {
          title: "Bienestar y movimiento",
          body: "Yoga prenatal y posparto, fisioterapia de suelo pÃ©lvico",
        },
        {
          title: "Cuidado experto",
          body: "Asesoras de lactancia, doulas de posparto",
        },
        {
          title: "Actividades para el bebÃ©",
          body: "NataciÃ³n para bebÃ©s, estimulaciÃ³n sensorial, masaje infantil",
        },
        {
          title: "Lugares y hostelerÃ­a",
          body: "CafÃ©s y espacios acogedores para familias",
        },
        {
          title: "Marcas y retail",
          body: "Descuentos en maternidad y artÃ­culos para bebÃ©",
        },
      ],
      note: "Los partners de lanzamiento se anuncian a medida que se incorporan.",
    },
    closing: { heading: "Tu cÃ­rculo te espera.", cta: "Ãšnete ahora" },
    godmother: {
      kicker: "Programa de Madrinas",
      heading: "Trae a una amiga y gana un mes de crÃ©ditos.",
      body: "Cada socia es Madrina desde el primer dÃ­a: tu cÃ³digo personal ya estÃ¡ en tu cuenta, para las madres que te preguntan dÃ³nde encontraste a tu gente. Sin vender nada y sin objetivos â€” solo una recomendaciÃ³n honesta, y crÃ©ditos cuando se convierte en membresÃ­a.",
      cta: "Verlo en tu cuenta",
      ctaNote: "Sin solicitud y sin aprobaciÃ³n â€” tu cÃ³digo ya estÃ¡ en tu cuenta.",
      steps: [
        { n: "01", title: "Busca tu cÃ³digo", body: "Ya estÃ¡ en tu cuenta desde el dÃ­a en que te unes â€” no hay que solicitar nada." },
        { n: "02", title: "CompÃ¡rtelo", body: "DÃ¡selo a la amiga que siempre pregunta, o cuenta el paseo que de verdad disfrutaste." },
        { n: "03", title: "Gana 20 crÃ©ditos", body: "5 crÃ©ditos cuando se une y 15 mÃ¡s a los tres meses â€” los crÃ©ditos no tienen lÃ­mite, asÃ­ que nada se pierde." },
      ],
    },
    footer: {
      blurb:
        "Un estilo de vida para la madre moderna.",
      explore: "Explorar",
      contact: "Contacto",
      legal: "Legal",
      terms: "TÃ©rminos y Condiciones",
      privacy: "PolÃ­tica de Privacidad",
      ambassadors: "Para Madrinas",
      partners: "Para Partners",
      social: "SÃ­guenos en Instagram y TikTok.",
      tagline: "Barcelona Â· EspaÃ±ol & English",
    },
  },
};
