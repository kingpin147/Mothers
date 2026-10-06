export type Locale = "en" | "es" | "fr";

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
        "Applications open one week a month. This Window is open now — and our first 50 members join with no joining fee.",
      windowNoteClosed:
        "Applications open one week a month, and this Window has closed. Join the waitlist and we will write to you the day the next one opens.",
    },
    why: {
      kicker: "Why The Mothers",
      heading: "Being a mother is a part of it, not all of it.",
      body: "Modern motherhood can be isolating — especially if you've just moved to the city, had your first baby, or don't have family nearby. The Mothers offers a space for mothers to connect and build long-lasting friendships. It sits in between: curated, safe, and social.",
      pillars: [
        {
          title: "By your stage",
          body: "Events grouped by stage — from pregnancy through age ten.",
        },
        {
          title: "Warm & intentional",
          body: "A trusted space where mothers connect honestly. No selling, no judgment.",
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
          title: "Join",
          body: "Create your account in moments — simple and welcoming.",
        },
        {
          n: "02",
          title: "Come along",
          body: "Book a walk, a play date, or a Mother's date near you — small rooms, so talking is easy.",
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
      heading: "One membership",
      price: "€39/month",
      priceSub: "or €99 every 3 months · no joining fee for our first 50 members",
      spotsLabel: (remaining: number) => `Only ${remaining} places left in this Window`,
      bullets: [
        "Community & stage groups",
        "Included Easy connection",
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
      note: "Launch partners are announced as they join.",
    },
    closing: { heading: "Your circle is waiting.", cta: "Join now" },
    godmother: {
      kicker: "Godmother programme",
      heading: "Bring a friend, earn a month of credits.",
      body: "Every member is a Godmother from day one: your personal referral code is already in your account, for the mothers who keep asking where you found your people. No selling, no quotas — just an honest recommendation, and credits when it turns into a membership.",
      cta: "See it in your account",
      ctaNote: "No application, no approval — your code is waiting in your account.",
      steps: [
        { n: "01", title: "Find your code", body: "It is already in your account the day you join — nothing to apply for." },
        { n: "02", title: "Share it", body: "Hand it to the friend who keeps asking, or post about the walk you actually enjoyed." },
        { n: "03", title: "Earn 20 credits", body: "5 credits the moment she joins, 15 more at her third month — credits never cap, so nothing is lost." },
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
        "Las solicitudes se abren una semana al mes. Esta Ventana está abierta ahora — y nuestras primeras 50 socias entran sin cuota de inscripción.",
      windowNoteClosed:
        "Las solicitudes se abren una semana al mes, y esta Ventana ya se ha cerrado. Únete a la lista de espera y te escribimos el día que se abra la siguiente.",
    },
    why: {
      kicker: "Por qué The Mothers",
      heading: "Ser madre es una parte, no todo lo que eres.",
      body: "La maternidad moderna puede ser aislante, sobre todo si acabas de mudarte a la ciudad, acabas de ser madre o no tienes familia cerca. The Mothers ofrece un espacio para que las madres conecten y construyan amistades duraderas. Está en el punto medio: cuidado, seguro y social.",
      pillars: [
        {
          title: "Por tu etapa",
          body: "Encuentros agrupados por etapa, desde el embarazo hasta los diez años.",
        },
        {
          title: "Cercano y cuidado",
          body: "Un espacio de confianza donde las madres conectan con honestidad. Sin ventas, sin juicios.",
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
          title: "Únete",
          body: "Crea tu cuenta en unos minutos — sencillo y accesible.",
        },
        {
          n: "02",
          title: "Ven a un encuentro",
          body: "Reserva un paseo, un play date o un Mother's date cerca de ti — grupos pequeños, para que hablar sea fácil.",
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
      heading: "Una sola membresía",
      price: "39€/mes",
      priceSub: "o 99€ cada 3 meses · sin cuota de inscripción para nuestras primeras 50 socias",
      spotsLabel: (remaining: number) => `Solo quedan ${remaining} plazas en esta Ventana`,
      bullets: [
        "Comunidad y grupos por etapa",
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
      note: "Los partners de lanzamiento se anuncian a medida que se incorporan.",
    },
    closing: { heading: "Tu círculo te espera.", cta: "Únete ahora" },
    godmother: {
      kicker: "Programa de Madrinas",
      heading: "Trae a una amiga y gana un mes de créditos.",
      body: "Cada socia es Madrina desde el primer día: tu código personal ya está en tu cuenta, para las madres que te preguntan dónde encontraste a tu gente. Sin vender nada y sin objetivos — solo una recomendación honesta, y créditos cuando se convierte en membresía.",
      cta: "Verlo en tu cuenta",
      ctaNote: "Sin solicitud y sin aprobación — tu código ya está en tu cuenta.",
      steps: [
        { n: "01", title: "Busca tu código", body: "Ya está en tu cuenta desde el día en que te unes — no hay que solicitar nada." },
        { n: "02", title: "Compártelo", body: "Dáselo a la amiga que siempre pregunta, o cuenta el paseo que de verdad disfrutaste." },
        { n: "03", title: "Gana 20 créditos", body: "5 créditos cuando se une y 15 más a los tres meses — los créditos no tienen límite, así que nada se pierde." },
      ],
    },
    footer: {
      blurb:
        "Un estilo de vida para la madre moderna.",
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
  fr: {
    nav: {
      home: "Accueil",
      membership: "Adhésion",
      events: "Événements",
      journal: "Journal",
      partners: "Partenaires",
      ambassadors: "Marraines",
      faq: "FAQ",
      applyBtn: "Rejoindre",
      loginBtn: "Connexion",
      account: "Mon Compte",
      logout: "Se déconnecter",
    },
    hero: {
      kicker: "Club privé de membres · Barcelone",
      title: "Trouvez vos semblables. Construisez votre cercle.",
      subtitle:
        "Un club privé pour les mères à Barcelone — de la grossesse jusqu'aux années d'école. Rencontrez des femmes à la même étape de vie, lors d'événements conçus exactement pour cela.",
      ctaPrimary: "Rejoindre",
      ctaWaitlist: "Rejoindre la liste d'attente",
      ctaSecondary: "Voir plus de détails",
      windowNoteOpen:
        "Les inscriptions ouvrent une semaine par mois. Cette fenêtre est ouverte — et nos 50 premières membres nous rejoignent sans frais d'adhésion.",
      windowNoteClosed:
        "Les inscriptions ouvrent une semaine par mois, et cette fenêtre est fermée. Rejoignez la liste d'attente et nous vous écrirons dès l'ouverture de la prochaine.",
    },
    why: {
      kicker: "Pourquoi The Mothers",
      heading: "Être mère en fait partie, mais ce n'est pas tout ce que vous êtes.",
      body: "La maternité moderne peut être isolante — surtout si vous venez d'arriver en ville, si vous avez votre premier bébé ou si vous n'avez pas de famille à proximité. The Mothers offre un espace pour se connecter et nouer des amitiés durables. C'est l'équilibre parfait : soigné, sûr et convivial.",
      pillars: [
        {
          title: "Par votre étape",
          body: "Des événements groupés par étape — de la grossesse jusqu'à dix ans.",
        },
        {
          title: "Chaleureux et bienveillant",
          body: "Un espace de confiance où les mères échangent avec honnêteté. Sans vente, sans jugement.",
        },
        {
          title: "Conçu pour durer",
          body: "Restez avec nous du ventre rond jusqu'aux dix ans de votre enfant — pas juste pour une saison.",
        },
      ],
    },
    how: {
      kicker: "Comment ça marche",
      heading: "Trois étapes vers votre cercle.",
      steps: [
        {
          n: "01",
          title: "Rejoignez",
          body: "Créez votre compte en quelques instants — simple et accueillant.",
        },
        {
          n: "02",
          title: "Venez",
          body: "Réservez une balade, une rencontre entre enfants ou une soirée entre mères près de chez vous — en petits groupes, pour échanger facilement.",
        },
        {
          n: "03",
          title: "Appartenez",
          body: "Continuez à venir et les amitiés se nouent d'elles-mêmes — personne n'est imposé.",
        },
      ],
    },
    membershipTeaser: {
      kicker: "Adhésion",
      heading: "Une seule adhésion",
      price: "39 €/mois",
      priceSub: "ou 99 € tous les 3 mois · pas de frais d'adhésion pour nos 50 premières membres",
      spotsLabel: (remaining: number) => `Plus que ${remaining} places dans cette session`,
      bullets: [
        "Communauté et groupes par étape",
        "Balades et rencontres au parc incluses",
        "20 crédits mensuels pour les expériences",
        "Avantages partenaires et réservations prioritaires",
      ],
      cta: "Découvrir l'adhésion complète",
    },
    partners: {
      kicker: "Avantages partenaires",
      heading: "Économisez sur le meilleur de Barcelone, au même endroit.",
      body: "Un réseau sélectionné de spécialistes et de lieux pour chaque étape — un partenaire de confiance par catégorie pour des recommandations sincères.",
      umbrellas: [
        {
          title: "Bien-être et mouvement",
          body: "Yoga prénatal et postnatal, kinésithérapie du périnée",
        },
        {
          title: "Soins et accompagnement experts",
          body: "Conseillères en allaitement, doulas post-partum",
        },
        {
          title: "Activités bébé et enfant",
          body: "Bébés nageurs, éveil sensoriel, massage pour bébé",
        },
        {
          title: "Lieux et accueil",
          body: "Cafés et espaces adaptés aux familles",
        },
        {
          title: "Marques et boutiques",
          body: "Réductions sur la maternité et les articles pour bébé",
        },
      ],
      note: "Les partenaires de lancement sont annoncés au fur et à mesure de leur arrivée.",
    },
    closing: { heading: "Votre cercle vous attend.", cta: "Rejoindre" },
    godmother: {
      kicker: "Programme Marraine",
      heading: "Invitez une amie, gagnez un mois de crédits.",
      body: "Chaque membre est marraine dès le premier jour : votre code de parrainage personnel est déjà dans votre compte, pour les mères qui vous demandent où vous avez trouvé votre cercle. Pas de vente, pas de quotas — juste une recommandation honnête, et des crédits lorsqu'elle devient membre.",
      cta: "Voir dans mon compte",
      ctaNote: "Pas de candidature, pas d'approbation — votre code vous attend déjà.",
      steps: [
        { n: "01", title: "Trouvez votre code", body: "Il est déjà dans votre compte dès votre inscription — rien à demander." },
        { n: "02", title: "Partagez-le", body: "Donnez-le à l'amie qui vous pose des questions, ou parlez de la balade que vous avez adorée." },
        { n: "03", title: "Gagnez 20 crédits", body: "5 crédits dès son inscription, 15 de plus à son troisième mois — les crédits n'expirent jamais, rien n'est perdu." },
      ],
    },
    footer: {
      blurb:
        "Un art de vivre pour la mère d'aujourd'hui.",
      explore: "Explorer",
      contact: "Contact",
      legal: "Mentions légales",
      terms: "Conditions Générales",
      privacy: "Politique de Confidentialité",
      ambassadors: "Pour les Marraines",
      partners: "Pour les Partenaires",
      social: "Suivez-nous sur Instagram et TikTok.",
      tagline: "Barcelone · Français, English & Español",
    },
  },
};
