export interface FaqItemData {
  group: string;
  note?: string;
  qEn: string;
  aEn: string;
  qEs: string;
  aEs: string;
  qFr?: string;
  aFr?: string;
  policyQuote?: string;
}

export const FAQ_GROUPS = [
  "Coming to an event now",
  "Credits and your wallet",
  "Membership, from January 2027",
  "The club itself",
] as const;

export type FaqGroupName = (typeof FAQ_GROUPS)[number];

export const FAQ_GROUP_NOTES: Record<string, { en: string; es: string; fr: string }> = {
  "Coming to an event now": {
    en: "Everything on the calendar is open to everyone until January 2027.",
    es: "Todo el calendario está abierto a todas hasta enero de 2027.",
    fr: "Tout le calendrier est ouvert à toutes jusqu’à janvier 2027.",
  },
  "Credits and your wallet": {
    en: "One wallet, no subscription, nothing that renews.",
    es: "Un único monedero, sin suscripción ni cobros recurrentes.",
    fr: "Un seul portefeuille, sans abonnement, rien qui ne se renouvelle.",
  },
  "Membership, from January 2027": {
    en: "What is coming, and what it means for anyone who came early.",
    es: "Lo que viene y las ventajas para quienes nos acompañen desde el inicio.",
    fr: "Ce qui arrive, et ce que cela signifie pour celles venues tôt.",
  },
  "The club itself": {
    en: "How it is run, and by whom.",
    es: "Cómo funciona el club y quién lo gestiona.",
    fr: "Comment il fonctionne, et qui le fait vivre.",
  },
};

export const CANONICAL_FAQS: FaqItemData[] = [
  // 1. Coming to an event now
  {
    group: "Coming to an event now",
    qEn: "Do I have to be a member to come?",
    aEn: "No — there is no membership to be had yet. Pick an event and book it: your account is created with that first booking. Walks and park socials are free; anything else takes credits.",
    qEs: "¿Tengo que ser socia para asistir?",
    aEs: "No — todavía no hay membresías. Elige un evento y resérvalo: tu cuenta se crea con esa primera reserva. Las caminatas y encuentros en el parque son gratis; todo lo demás requiere créditos.",
    qFr: "Dois-je être membre pour venir ?",
    aFr: "Non — il n'y a pas encore d'adhésion. Choisissez un événement et réservez-le : votre compte est créé avec cette première réservation. Les promenades et rencontres au parc sont gratuites ; tout le reste nécessite des crédits.",
  },
  {
    group: "Coming to an event now",
    qEn: "Do I have to be a mother?",
    aEn: "Yes, and expecting counts. The Mothers is built for mothers, from the first trimester through your child’s school years. If motherhood is still ahead of you, join the letter and we will be here when it is not.",
    qEs: "¿Tengo que ser madre?",
    aEs: "Sí, y el embarazo cuenta. The Mothers está pensado para madres, desde el primer trimestre de gestación hasta los años escolares. Si la maternidad aún está por llegar, únete a la carta y estaremos aquí cuando llegue el momento.",
    qFr: "Dois-je être mère ?",
    aFr: "Oui, et être enceinte compte. The Mothers est conçu pour les mères, du premier trimestre jusqu'aux années scolaires de votre enfant. Si la maternité est encore devant vous, rejoignez la lettre et nous serons là le moment venu.",
  },
  {
    group: "Coming to an event now",
    qEn: "What does an event cost?",
    aEn: "Walks and park socials are free. A hosted coffee or brunch is 1 credit, a class or an expert session 6 to 9, a supper 7 to 12, and a signature moment 16 to 28. Every card shows its price in credits. From January 2027 each event has a member price and a non-member price, and cards show both.",
    qEs: "¿Cuánto cuesta un evento?",
    aEs: "Las caminatas y encuentros en el parque son gratis. Un café o brunch con anfitriona cuesta 1 crédito, una clase o taller con especialista entre 6 y 9, una cena entre 7 y 12, y un momento signature entre 16 y 28. Cada tarjeta muestra su precio en créditos. A partir de enero de 2027 cada evento tiene precio para socias y precio general.",
    qFr: "Combien coûte un événement ?",
    aFr: "Les promenades et rencontres au parc sont gratuites. Un café ou brunch animé coûte 1 crédit, un cours ou une session d'expert 6 à 9, un dîner 7 à 12, et un moment signature 16 à 28. Chaque fiche affiche son prix en crédits. À partir de janvier 2027, chaque événement aura un prix membre et un prix non-membre.",
    policyQuote: "It quotes a figure that also lives in settings.",
  },
  {
    group: "Coming to an event now",
    qEn: "Can I cancel?",
    aEn: "Yes. Each event has its own cancellation window, shown on the card and at booking — free events any time, hosted coffees 24 hours, classes and sessions 48 hours, suppers and signature moments 7 days. Cancel inside the window and your credits come straight back; after it, they return only if someone takes your place. Two no-shows in three months pause your booking until you write to us.",
    qEs: "¿Puedo cancelar?",
    aEs: "Sí. Cada evento dispone de su propio plazo de cancelación indicado en la tarjeta y al reservar — eventos gratuitos en cualquier momento, cafés con anfitriona 24 horas, clases y sesiones 48 horas, cenas y momentos signature 7 días. Si cancelas dentro del plazo, tus créditos vuelven íntegros; fuera de plazo, solo si otra persona ocupa tu plaza. Dos ausencias sin aviso en tres meses pausan tus reservas hasta que nos escribas.",
    qFr: "Puis-je annuler ?",
    aFr: "Oui. Chaque événement a son propre délai d'annulation indiqué sur la fiche et lors de la réservation — événements gratuits à tout moment, cafés animés 24h, cours et ateliers 48h, dîners et moments signature 7 jours. Annulez dans le délai et vos crédits reviennent immédiatement ; après, ils ne reviennent que si quelqu'un prend votre place. Deux absences non signalées en trois mois suspendent vos réservations jusqu'à ce que vous nous écriviez.",
    policyQuote: "It quotes a figure that also lives in settings.",
  },
  {
    group: "Coming to an event now",
    qEn: 'Why do some events say "gathering"?',
    aEn: "Some events carry a fixed cost to us — a speaker, a studio, a private room — so they need a minimum number of us to run. Those hold your credits rather than spending them, confirm about ten days ahead, and return everything in full if the evening does not go ahead.",
    qEs: '¿Por qué algunos eventos indican "reuniendo grupo"?',
    aEs: "Algunos eventos implican un coste fijo para nosotros — ponente, estudio, sala privada — por lo que necesitan un número mínimo de asistentes para celebrarse. En ellos los créditos quedan retenidos sin gastarse, se confirman unos diez días antes y se devuelven íntegros si el encuentro no llegase a realizarse.",
    qFr: 'Pourquoi certains événements indiquent "rassemblement" ?',
    aFr: "Certains événements entraînent des frais fixes — intervenant, studio, salle privée — et nécessitent donc un nombre minimum de participantes. Ceux-ci bloquent vos crédits sans les dépenser, se confirment une dizaine de jours avant, et remboursent l'intégralité si la soirée n'a pas lieu.",
  },
  {
    group: "Coming to an event now",
    qEn: "Can I bring my children?",
    aEn: "Every event is labelled clearly: children welcome, or mothers only. You always know before you book. Where an event is not childcare-provided, your child is your own to watch — which most of the walks and play dates assume anyway.",
    qEs: "¿Puedo traer a mis hijos?",
    aEs: "Cada evento está claramente señalizado: niños bienvenidos o solo madres. Siempre lo sabrás antes de reservar. Salvo en eventos con servicio de cuidado infantil, cada madre supervisa a sus propios hijos — lo cual la mayoría de caminatas y tardes de juego ya asumen.",
    qFr: "Puis-je amener mes enfants ?",
    aFr: "Chaque événement est clairement étiqueté : enfants bienvenus ou réservé aux mères. Vous le savez toujours avant de réserver. Lorsqu'un événement ne propose pas de garde d'enfants, la surveillance de votre enfant vous incombe — ce que supposent déjà la plupart des promenades et sorties jeux.",
  },

  // 2. Credits and your wallet
  {
    group: "Credits and your wallet",
    qEn: "How do credits work?",
    aEn: "Credits are our currency. You add them in your account, in exactly the quantity you want, and they sit in your wallet until you spend them. Each credit expires six months after you buy it, and the oldest in your wallet are always spent first, so nothing is wasted by accident.",
    qEs: "¿Cómo funcionan los créditos?",
    aEs: "Los créditos son nuestra moneda. Los añades a tu cuenta en la cantidad exacta que desees y permanecen en tu monedero hasta que los uses. Cada crédito caduca a los seis meses de comprarlo y siempre se consumen primero los más antiguos para que nada se pierda por descuido.",
    qFr: "Comment fonctionnent les crédits ?",
    aFr: "Les crédits sont notre monnaie. Vous les ajoutez sur votre compte, dans la quantité exacte souhaitée, et ils restent dans votre portefeuille jusqu'à ce que vous les utilisiez. Chaque crédit expire six mois après son achat, et les plus anciens sont toujours dépensés en premier.",
  },
  {
    group: "Credits and your wallet",
    qEn: "What if I am short at the moment of booking?",
    aEn: "Press book and we show you what the event costs, what you have, and the shortfall. Pay for the difference and the place is yours in the same step — you come straight back to the event you were looking at.",
    qEs: "¿Qué pasa si me faltan créditos al momento de reservar?",
    aEs: "Pulsa en reservar y te mostramos lo que cuesta el evento, lo que tienes y la diferencia. Paga la diferencia y la plaza es tuya en el mismo paso — vuelves directamente al evento que estabas mirando.",
    qFr: "Que se passe-t-il s'il me manque des crédits au moment de réserver ?",
    aFr: "Cliquez sur réserver et nous vous indiquons le coût de l'événement, votre solde et le montant manquant. Réglez la différence et la place est à vous dans la même étape — vous revenez directement à l'événement consulté.",
  },
  {
    group: "Credits and your wallet",
    qEn: "How do I open an account?",
    aEn: "Book your first event and your account is created at that step, or open a free account from Sign in (or La Gazette) without booking. If the event you pick is free, no card is needed at all.",
    qEs: "¿Cómo abro una cuenta?",
    aEs: "Reserva tu primer evento y tu cuenta se crea en ese paso, o abre una cuenta gratuita desde Iniciar sesión (o La Gazette) sin reservar. Si el evento elegido es gratis, no se necesita tarjeta en absoluto.",
    qFr: "Comment ouvrir un compte ?",
    aFr: "Réservez votre premier événement et votre compte est créé à cette étape, ou ouvrez un compte gratuit depuis Se connecter (ou La Gazette) sans réserver. Si l'événement choisi est gratuit, aucune carte bancaire n'est requise.",
  },
  {
    group: "Credits and your wallet",
    qEn: "What happens to my credits in January 2027?",
    aEn: "They stay yours, with their six-month life intact, and you can spend them down exactly as before. What changes is that new credits come with membership, so a wallet without one will not be topped up again.",
    qEs: "¿Qué pasará con mis créditos en enero de 2027?",
    aEs: "Seguirán siendo tuyos con sus seis meses de validez intactos y podrás gastarlos exactamente como antes. Lo que cambia es que los nuevos créditos vendrán con la membresía, por lo que un monedero sin ella no se recargará de nuevo.",
    qFr: "Qu'advient-il de mes crédits en janvier 2027 ?",
    aFr: "Ils restent à vous, avec leur durée de six mois intacte, et vous pouvez les utiliser exactement comme avant. Ce qui change, c'est que les nouveaux crédits seront inclus avec l'adhésion.",
  },

  // 3. Membership, from January 2027
  {
    group: "Membership, from January 2027",
    qEn: "Why not sell memberships now?",
    aEn: "Because a membership is a promise about a calendar, a community and a partner list, and all three should be real before anyone pays monthly for them. Until then you pay for the event you come to, and nothing else.",
    qEs: "¿Por qué no vender membresías ahora?",
    aEs: "Porque una membresía es una promesa sobre un calendario, una comunidad y una red de colaboradores, y los tres deben ser reales antes de cobrar mensualmente por ellos. Hasta entonces pagas por el evento al que asistes, y nada más.",
    qFr: "Pourquoi ne pas vendre d'adhésions maintenant ?",
    aFr: "Parce qu'une adhésion est une promesse concernant un calendrier, une communauté et une liste de partenaires, et tous trois doivent être réels avant de faire payer chaque mois. D'ici là, vous payez pour l'événement auquel vous assistez, et rien d'autre.",
  },
  {
    group: "Membership, from January 2027",
    qEn: "What will it cost?",
    aEn: "€39 a month or €99 every three months — one membership, one rate, two rhythms. Twenty credits are granted at the start of each month, so the calendar stays reachable all quarter rather than filling up in week one. Mothers who open an account before launch join without a joining fee.",
    qEs: "¿Cuánto costará?",
    aEs: "39€ al mes o 99€ cada tres meses — una sola membresía, una tarifa, dos ritmos. Se asignan veinte créditos al inicio de cada mes, para que el calendario esté disponible todo el trimestre. Las madres que abran una cuenta antes del lanzamiento se unen sin cuota de alta.",
    qFr: "Combien cela coûtera-t-il ?",
    aFr: "39 € par mois ou 99 € tous les trois mois — une seule adhésion, un seul tarif, deux rythmes. Vingt crédits sont attribués au début de chaque mois. Les mères qui créent un compte avant le lancement adhèrent sans frais d'adhésion.",
    policyQuote: "It quotes a figure that also lives in settings.",
  },
  {
    group: "Membership, from January 2027",
    qEn: "Can I still come without membership?",
    aEn: "Yes. Members and non-members book the same events with credits — non-members pay the non-member price. Some events with limited places open to members first, and to everyone else from a date shown on the card.",
    qEs: "¿Podré seguir viniendo sin membresía?",
    aEs: "Sí. Socias y no socias reservan los mismos eventos con créditos — las no socias pagan el precio general. Algunos eventos con plazas limitadas se abren primero para socias, y para las demás a partir de una fecha indicada en la tarjeta.",
    qFr: "Pourrai-je toujours venir sans adhésion ?",
    aFr: "Oui. Les membres et non-membres réservent les mêmes événements avec des crédits — les non-membres paient le prix non-membre. Certains événements à places limitées s'ouvrent d'abord aux membres, puis à toutes à partir d'une date indiquée sur la fiche.",
  },
  {
    group: "Membership, from January 2027",
    qEn: "Am I first in line?",
    aEn: "Anyone who has booked an event before January 2027 hears from us before membership opens publicly.",
    qEs: "¿Tendré prioridad?",
    aEs: "Cualquier persona que haya reservado un evento antes de enero de 2027 recibirá noticias nuestras antes de que la membresía se abra públicamente.",
    qFr: "Suis-je prioritaire ?",
    aFr: "Toute personne ayant réservé un événement avant janvier 2027 aura de nos nouvelles avant l'ouverture publique des adhésions.",
  },
  {
    group: "Membership, from January 2027",
    qEn: "Will there still be free events?",
    aEn: "Yes. Every event has its own price, and some are free. Once membership opens, an event can have a member price and a non-member price — the card shows what you pay.",
    qEs: "¿Seguirá habiendo eventos gratuitos?",
    aEs: "Sí. Cada evento tiene su propio precio y algunos son gratuitos. Una vez que abra la membresía, un evento puede tener precio para socias y precio general — la tarjeta muestra lo que pagas.",
    qFr: "Y aura-t-il encore des événements gratuits ?",
    aFr: "Oui. Chaque événement a son propre prix, et certains sont gratuits. Une fois l'adhésion ouverte, un événement peut avoir un prix membre et un prix non-membre — la fiche indique ce que vous payez.",
  },

  // 4. The club itself
  {
    group: "The club itself",
    qEn: "Where do events happen?",
    aEn: "Across Barcelona — Gràcia, Eixample, Ciutat Vella, Sant Antoni, Sarrià and Les Corts so far, with a few things online. We publish the neighbourhood on the card and the exact address when you book.",
    qEs: "¿Dónde se celebran los eventos?",
    aEs: "Por toda Barcelona — Gràcia, Eixample, Ciutat Vella, Sant Antoni, Sarrià y Les Corts por ahora, con algunas actividades online. Publicamos el barrio en la tarjeta y la dirección exacta al reservar.",
    qFr: "Où ont lieu les événements ?",
    aFr: "Partout dans Barcelone — Gràcia, Eixample, Ciutat Vella, Sant Antoni, Sarrià et Les Corts pour le moment, avec quelques rencontres en ligne. Nous publions le quartier sur la fiche et l'adresse exacte lors de la réservation.",
  },
  {
    group: "The club itself",
    qEn: "In which language?",
    aEn: "Bilingual from day one. Each event card says which languages the room will be speaking — usually Spanish and English, sometimes Catalan or French.",
    qEs: "¿En qué idioma?",
    aEs: "Bilingüe desde el primer día. Cada tarjeta de evento indica qué idiomas se hablarán — habitualmente español e inglés, a veces catalán o francés.",
    qFr: "Dans quelle langue ?",
    aFr: "Bilingue dès le premier jour. Chaque fiche d'événement précise les langues parlées — généralement espagnol et anglais, parfois catalan ou français.",
  },
  {
    group: "The club itself",
    qEn: "What does a host do?",
    aEn: "A host welcomes the other mothers at an event on the calendar. She arrives 10 minutes early, says hello to everyone as they arrive and makes the introductions, so nobody stands alone.",
    qEs: "¿Qué hace una anfitriona?",
    aEs: "Una anfitriona da la bienvenida a las demás madres en un evento del calendario. Llega 10 minutos antes, saluda a todas a medida que llegan y hace las presentaciones, para que nadie se quede sola.",
    qFr: "Que fait une hôtesse ?",
    aFr: "Une hôtesse accueille les autres mères lors d'un événement du calendrier. Elle arrive 10 minutes à l'avance, salue chacune à son arrivée et fait les présentations pour que personne ne reste seule.",
  },
  {
    group: "The club itself",
    qEn: "Who can host, and how?",
    aEn: "Any mother who has been to at least 2 events, with no no-shows in the last 3 months. Some events are marked as needing a host: book it, then ask to host it on the Become a host page or in My Account → Hosting. The team confirms by email, with the meeting point and who is coming.",
    qEs: "¿Quién puede ser anfitriona y cómo?",
    aEs: "Cualquier madre que haya asistido al menos a 2 eventos, sin ausencias sin aviso en los últimos 3 meses. Algunos eventos están marcados como necesitando anfitriona: resérvalo y luego solicita ser anfitriona en la página Ser anfitriona o en Mi Cuenta → Anfitriona. El equipo confirma por email con el punto de encuentro y quiénes asisten.",
    qFr: "Qui peut être hôtesse, et comment ?",
    aFr: "Toute mère ayant assisté à au moins 2 événements, sans absence injustifiée au cours des 3 derniers mois. Certains événements indiquent qu'ils ont besoin d'une hôtesse : réservez-le, puis demandez à être hôtesse sur la page Devenir hôtesse ou dans Mon Compte → Hôte. L'équipe confirme par e-mail avec le point de rendez-vous et la liste des participantes.",
    policyQuote: "It quotes a figure that also lives in settings.",
  },
  {
    group: "The club itself",
    qEn: "What do I earn as a host?",
    aEn: "2 credits each time, added once the event has run, plus 50% of your place back in credits. Credits last 6 months. If you cancel less than 48 hours before, or do not come, you can host again after attending three more events.",
    qEs: "¿Qué recibo como anfitriona?",
    aEs: "2 créditos cada vez, añadidos una vez celebrado el evento, más el 50% del valor de tu plaza devuelto en créditos. Los créditos duran 6 meses. Si cancelas con menos de 48 horas de antelación o no asistes, puedes volver a ser anfitriona tras asistir a tres eventos más.",
    qFr: "Que gagne-t-on en tant qu'hôtesse ?",
    aFr: "2 crédits à chaque fois, crédités une fois l'événement passé, plus 50 % de votre place remboursée en crédits. Les crédits durent 6 mois. Si vous annulez moins de 48 heures avant ou ne venez pas, vous pouvez à nouveau être hôtesse après avoir assisté à trois événements supplémentaires.",
    policyQuote: "It quotes a figure that also lives in settings.",
  },
  {
    group: "The club itself",
    qEn: "What are the rules in La Gazette?",
    aEn: "Kindness first, no selling to other mothers, what is shared stays there, and advice from mothers is not medical advice. Anyone can read. Posting needs a free account. Once membership opens, non-members can post or reply 3 times, then membership lets you keep posting. You can post anonymously, but every post stays linked to your account. Photos: up to 4, and no children other than your own unless you have their parent’s permission. Up to 5 posts and 20 replies a day. Report anything that breaks the rules — a host reads every report the same day.",
    qEs: "¿Cuáles son las normas en La Gazette?",
    aEs: "Amabilidad ante todo, nada de vender a otras madres, lo que se comparte se queda allí, y los consejos de madres no son consejo médico. Cualquiera puede leer. Publicar requiere una cuenta gratis. Cuando abra la membresía, las no miembros podrán publicar o responder 3 veces, y luego la membresía permite seguir. Puedes publicar de forma anónima, pero cada mensaje sigue ligado a tu cuenta. Fotos: hasta 4, y sin otros niños que los tuyos salvo con permiso de sus padres. Hasta 5 mensajes y 20 respuestas al día. Denuncia lo que rompa las normas — una anfitriona lee cada denuncia el mismo día.",
    qFr: "Quelles sont les règles dans La Gazette ?",
    aFr: "La bienveillance d'abord, pas de vente aux autres mères, ce qui est partagé reste ici, et les conseils de mères ne sont pas des avis médicaux. Tout le monde peut lire. Publier nécessite un compte gratuit. À l'ouverture de l'adhésion, les non-membres pourront publier ou répondre 3 fois, puis l'adhésion permet de continuer. Vous pouvez publier anonymement, mais chaque message reste lié à votre compte. Photos : jusqu'à 4, et pas d'autres enfants que les vôtres sans l'accord de leurs parents. Jusqu'à 5 messages et 20 réponses par jour. Signalez tout ce qui enfreint les règles — une hôtesse lit chaque signalement le jour même.",
  },
  {
    group: "The club itself",
    qEn: "Who are the partners?",
    aEn: "One trusted specialist per category — a yoga studio, a sleep consultancy, a lactation service, a career coach, the places we book again and again. They run the sessions, and from January 2027 members get standing offers with them.",
    qEs: "¿Quiénes son los colaboradores?",
    aEs: "Un especialista de confianza por categoría — estudio de yoga, asesoría de sueño, consultoría de lactancia, coach profesional, los lugares a los que acudimos una y otra vez. Imparten las sesiones y a partir de enero de 2027 las socias tienen ofertas permanentes con ellos.",
    qFr: "Qui sont les partenaires ?",
    aFr: "Un spécialiste de confiance par catégorie — un studio de yoga, une consultante en sommeil, un service de lactation, un coach professionnel, les lieux où nous allons encore et encore. Ils animent les sessions, et à partir de janvier 2027, les membres bénéficient d'offres permanentes.",
  },
  {
    group: "The club itself",
    qEn: "How do you keep the room safe?",
    aEn: "Small rooms, a host at many events, a clear rule against selling to other mothers, and the ability to remove anyone who breaks it. When membership opens there is a light screening step on top of that.",
    qEs: "¿Cómo se mantiene un espacio seguro?",
    aEs: "Grupos reducidos, una anfitriona en muchos eventos, una norma clara contra la venta a otras madres y la capacidad de retirar a cualquiera que la incumpla. Cuando abra la membresía habrá un ligero paso de verificación adicional.",
    qFr: "Comment gardez-vous l'espace sécurisant ?",
    aFr: "De petits groupes, une hôtesse à de nombreux événements, une règle claire interdisant la vente aux autres mères, et la possibilité d'exclure toute personne enfreignant les règles. À l'ouverture de l'adhésion, une légère étape de sélection s'y ajoutera.",
  },
];

