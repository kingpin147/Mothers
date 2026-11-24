"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function TermsPage() {
  const { language: lang } = useLanguage();

  const termsData = {
    title: lang === "fr" ? "Conditions Générales" : lang === "es" ? "Términos y Condiciones" : "Terms & Conditions",
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
        ? "Les présentes Conditions régissent votre utilisation de themothers.cc ainsi que du compte, du portefeuille de crédits et des événements qui y sont proposés. The Mothers est un club pour les mères. Le calendrier est ouvert à chaque mère selon les conditions ci-dessous. Certains événements sont organisés par d'autres communautés de mères et partenaires, signalés sur la fiche par « Avec [nom] ». En ouvrant un compte ou en réservant une place, vous acceptez d'être liée par les présentes Conditions."
        : lang === "es"
        ? "Estos Términos rigen el uso de themothers.cc y de la cuenta, monedero de créditos y eventos ofrecidos en él. The Mothers es un club para madres. El calendario está abierto a todas las madres bajo las condiciones descritas a continuación. Algunos eventos son organizados por otras comunidades de madres y organizadores independientes, indicados en la ficha como «Con [nombre]». Al crear una cuenta o reservar una plaza, aceptas quedar vinculada por estos Términos."
        : "These Terms govern your use of themothers.cc and of the account, credit wallet and events offered on it. The Mothers is a club for mothers. The calendar is open to every mother on the terms below. Some events are run by other mother communities and organisers, shown on the card as “With [name]”. By opening an account or booking a place you agree to be bound by these Terms.",
    sections: [
      {
        n: "01",
        title: lang === "fr" ? "Qui peut participer" : lang === "es" ? "Quién puede participar" : "Who can take part",
        body:
          lang === "fr"
            ? "The Mothers est réservé aux mères, et la grossesse compte — si vous êtes enceinte, vous êtes la bienvenue. Les comptes, crédits et places sont proposés sur cette base. Si vous nous indiquez ne pas être mère, nous ne pouvons pas vous proposer de place, et vous êtes invitée à rejoindre la lettre à la place."
            : lang === "es"
            ? "The Mothers es para madres, y el embarazo cuenta: si estás embarazada, eres bienvenida. Las cuentas, créditos y plazas se ofrecen bajo esta condición. Si nos indicas que no eres madre, no podremos ofrecerte plaza y te invitamos a suscribirte a la carta informativa."
            : "The Mothers is for mothers, and expecting counts — if you are pregnant, you are welcome. Accounts, credits and places are offered on that basis. If you tell us you are not a mother we cannot offer you a place, and you are welcome to join the letter instead.",
      },
      {
        n: "02",
        title: lang === "fr" ? "Comptes" : lang === "es" ? "Cuentas" : "Accounts",
        body:
          lang === "fr"
            ? "Vous pouvez ouvrir un compte gratuit à tout moment, ou en faire créer un lors de la réservation de votre premier événement. Il conserve votre nom, email, numéro de téléphone et mot de passe. Il n'y a ni candidature ni frais. Vous êtes responsable de la confidentialité de votre mot de passe et de tout ce qui est réservé depuis votre compte. Vous pouvez supprimer votre compte à tout moment depuis Mon Compte."
            : lang === "es"
            ? "Puedes abrir una cuenta gratuita en cualquier momento, o se creará una al reservar tu primer evento. Guarda tu nombre, correo, teléfono y contraseña. No hay solicitud previa ni cuota. Eres responsable de mantener segura tu contraseña y de todo lo reservado desde tu cuenta. Puedes eliminar tu cuenta en cualquier momento desde Mi Cuenta."
            : "You can open a free account at any time, or have one created when you book your first event. It holds your name, email, phone number and a password. There is no application and no fee. You are responsible for keeping your password to yourself and for anything booked from your account. You can delete your account at any time from My Account.",
      },
      {
        n: "03",
        title: lang === "fr" ? "Crédits" : lang === "es" ? "Créditos" : "Credits",
        body:
          lang === "fr"
            ? "Les crédits sont achetés au prix par crédit affiché sur la page Recharger avant de payer, dans la quantité exacte que vous choisissez, et sont conservés dans votre portefeuille. Chaque crédit expire six mois après son arrivée dans votre portefeuille, et les crédits les plus anciens sont toujours dépensés en premier. Les crédits ne constituent pas de l'argent et ne sont pas transférables entre comptes. Les crédits achetés et non utilisés peuvent être remboursés sur votre carte si vous en faites la demande dans les 14 jours suivant l'achat ; passé ce délai, ils ne peuvent être échangés contre des espèces. Des crédits peuvent également être gagnés : 2 pour l'accueil d'un événement une fois déroulé (plus 50% du prix de votre place remboursé), 0,5 pour chaque rencontre organisée réunissant au moins 3 mères (crédité par tranche de 1 crédit pour 2 rencontres), et — lorsque l'adhésion s'ouvre — 5 via le programme Marraine pour chaque mère devenant membre avec votre code. Les crédits gagnés suivent la même règle de six mois."
            : lang === "es"
            ? "Los créditos se compran al precio por crédito mostrado en la página de Recarga antes de pagar, en la cantidad exacta que elijas, y se guardan en tu monedero. Cada crédito caduca a los seis meses de ingresar en tu monedero, y los más antiguos siempre se gastan primero. Los créditos no son dinero ni son transferibles entre cuentas. Los créditos comprados y no utilizados pueden reembolsarse a tu tarjeta si lo solicitas dentro de los 14 días posteriores a la compra; después no se canjean por efectivo. Los créditos también pueden ganarse: 2 por ser anfitriona una vez realizado el evento (más el 50% del valor de tu plaza devuelto), 0,5 por cada encuentro que organices con al menos 3 madres (añadido como 1 crédito cada 2 encuentros), y —una vez abierta la membresía— 5 a través del programa Madrina por cada madre que se haga miembro con tu código. Los créditos ganados siguen la misma regla de seis meses."
            : "Credits are bought at the price per credit shown on the Top Up page before you pay, in the exact quantity you choose, and are held in your wallet. Each credit expires six months after it reaches your wallet, and the oldest credits are always spent first. Credits are not money and are not transferable between accounts. Credits you bought and have not used can be refunded to your card if you ask within 14 days of buying them; after that they cannot be exchanged for cash. Credits can also be earned: 2 for hosting an event once it has run (plus 50% of your place back), 0.5 for each gathering you organise that takes place with at least 3 mothers (added as 1 credit for every 2), and — once membership opens — 5 through the Godmother programme for each mother who becomes a member with your code. Earned credits follow the same six-month rule.",
      },
      {
        n: "04",
        title: lang === "fr" ? "Réservations et annulations" : lang === "es" ? "Reservas y cancelaciones" : "Bookings and cancellations",
        body:
          lang === "fr"
            ? "Chaque événement dispose d'une capacité fixe, sauf ceux publiés en liste ouverte, et les places sont confirmées par ordre de réception. La réservation ferme le jour de l'événement à l'heure indiquée. Chaque événement comporte sa propre fenêtre d'annulation, affichée sur l'événement et lors de la réservation. Libérez une place avant la clôture de la fenêtre et vous êtes intégralement remboursée — en crédits sur votre portefeuille, ou sur votre carte pour les événements payés par carte ; après ce délai, vous n'êtes remboursée que si la place est reprise avant le début de l'événement. Les événements et rencontres gratuits ne comportent rien à rembourser. Si vous réservez et ne venez pas sans libérer votre place, une absence non signalée (no-show) est enregistrée et vous ne pouvez plus accueillir ni organiser pendant trois mois."
            : lang === "es"
            ? "Cada evento tiene un aforo fijo salvo los publicados como lista abierta, y las plazas se confirman por orden de llegada. Las reservas cierran el mismo día del evento a la hora indicada. Cada evento tiene su propio plazo de cancelación, mostrado en la ficha y al reservar. Libera tu plaza antes de que cierre el plazo y se te reembolsará al completo —en créditos a tu monedero, o a tu tarjeta en eventos de pago con tarjeta—; pasado el plazo, solo se reembolsa si otra madre ocupa tu lugar antes de empezar. Los eventos y encuentros gratuitos no tienen importe reembolsable. Si reservas y no asistes sin liberar tu plaza, se registrará como no-show y no podrás ser anfitriona ni organizar encuentros durante tres meses."
            : "Every event has a fixed capacity except those published as an open list, and places are confirmed in the order received. Booking closes on the day of the event at the time shown. Each event carries its own cancellation window, shown on the event and at booking. Release a place before the window closes and you are refunded in full — credits to your wallet, or to your card for events paid by card; after it, you are refunded only if the place is filled before the event starts. Free events and gatherings carry nothing to refund. If you book and do not come without releasing your place, it is recorded as a no-show and you cannot host or organise for three months after it.",
      },
      {
        n: "05",
        title: lang === "fr" ? "Événements avec minimum requis" : lang === "es" ? "Eventos con aforo mínimo" : "Events with a minimum",
        body:
          lang === "fr"
            ? "Certains événements comportent un coût fixe — un intervenant, un atelier, une salle privée — et sont publiés avec le nombre minimum de mères nécessaire à leur tenue, signalés « à confirmer » jusqu'à ce que ce seuil soit atteint. Vous payez lors de la réservation. Si le minimum n'est pas atteint, l'organisateur décide de maintenir l'événement ou de l'annuler ; s'il est annulé, chacun est intégralement remboursé."
            : lang === "es"
            ? "Algunos eventos tienen un coste fijo —un ponente, un estudio, una sala privada— y se publican con el número mínimo de madres necesario para realizarse, indicados como «por confirmar» hasta alcanzarlo. Pagas al reservar. Si no se alcanza el mínimo, el organizador decide si realiza el evento o lo cancela; si se cancela, se reembolsa el importe íntegro a todas las inscritas."
            : "Some events carry a fixed cost — a speaker, a studio, a private room — and are published with the minimum number of mothers needed to run, marked “to be confirmed” until it is reached. You pay when you book. If the minimum is not met, the organiser decides whether to run the event anyway or cancel it; if it is cancelled, everyone is refunded in full.",
      },
      {
        n: "06",
        title: lang === "fr" ? "Enfants et sécurité familiale" : lang === "es" ? "Menores y seguridad familiar" : "Children and family safety",
        body:
          lang === "fr"
            ? "Chaque événement indique clairement si les enfants sont les bienvenus ou s'il est réservé aux mères. Sauf si une garde d'enfants est expressément prévue, les parents et tuteurs restent responsables de la surveillance de leurs propres enfants tout au long de l'événement. The Mothers apporte un soin raisonnable au choix des lieux et organisateurs, mais ne saurait se substituer à la surveillance parentale."
            : lang === "es"
            ? "Cada evento indica claramente si los niños son bienvenidos o si es exclusivo para madres. Salvo que un evento cuente explícitamente con servicio de guardería, los padres o tutores son los únicos responsables de supervisar a sus hijos en todo momento. The Mothers selecciona con esmero los espacios y organizadores, pero no sustituye la supervisión parental."
            : "Every event is labelled clearly as children welcome or mothers only. Unless an event explicitly provides childcare, parents and guardians remain responsible for supervising their own children throughout. The Mothers takes reasonable care in choosing venues and organisers but is not a substitute for parental supervision.",
      },
      {
        n: "07",
        title: lang === "fr" ? "Règles communautaires" : lang === "es" ? "Normas de la comunidad" : "Community standards",
        body:
          lang === "fr"
            ? "Nous demandons à chacun de traiter les autres mères, hôtes et organisateurs avec respect et de préserver des espaces sûrs pour les enfants. Les entreprises ne sont pas autorisées à vendre aux mères ; les mères ne peuvent vendre les affaires de leur propre famille que dans la rubrique « À vendre » du Forum. Sur Le Forum et dans les messages privés, les mêmes normes s'appliquent : les publications restent liées à votre compte même lorsqu'elles sont affichées anonymement, les photos ne doivent pas montrer d'enfants tiers sans l'autorisation parentale, et les envois sont régulés pour éviter le spam. Vous pouvez bloquer toute personne et signaler publications, réponses, messages et avis ; les signalements sont traités le jour même et les contenus peuvent être masqués ou supprimés. Nous pouvons refuser ou retirer une place à toute personne dont le comportement met autrui en danger ou enfreint les présentes Conditions."
            : lang === "es"
            ? "Pedimos a todas tratar a las demás madres, anfitrionas y organizadores con respeto, y mantener los espacios seguros para los niños. Los negocios no pueden vender a las madres; las madres solo pueden vender artículos familiares propios en el tema «En venta» del Foro. En El Foro y en los mensajes privados rigen las mismas normas: las publicaciones quedan vinculadas a tu cuenta incluso si son anónimas, las fotos no pueden mostrar menores ajenos sin permiso de sus progenitores, y el ritmo de publicación está limitado contra el spam. Puedes bloquear a cualquier usuario y denunciar publicaciones, respuestas, mensajes y reseñas; las denuncias se revisan en el mismo día y el contenido puede ocultarse o eliminarse. Nos reservamos el derecho de retirar o denegar la plaza a quien ponga en riesgo a otras personas o incumpla estos Términos."
            : "We ask everyone to treat other mothers, hosts and organisers with respect and to keep shared spaces safe for children. Businesses may not sell to mothers; mothers may sell their own family’s things only in the “For sale” topic of The Forum. In The Forum and in private messages the same standards apply: posts stay linked to your account even when shown anonymously, photos may not show other people’s children without their parent’s permission, and posting is limited to prevent spam. You can block anyone, and report posts, replies, messages and reviews; reports are reviewed the same day and content may be hidden or removed. We may refuse or withdraw a place from anyone whose conduct puts others at risk or who breaches these Terms.",
      },
      {
        n: "08",
        title: lang === "fr" ? "Événements organisés par des communautés et ateliers" : lang === "es" ? "Eventos organizados por comunidades y talleres" : "Events run by communities and workshops",
        body:
          lang === "fr"
            ? "Les événements portant la mention « Avec [nom] » sont organisés par une communauté, un studio ou une entreprise indépendante, qui est responsable de leur exécution et, pour les événements payants, agit en tant que vendeur : vous réglez par carte à la réservation, le paiement est transmis à l'organisateur via notre prestataire de paiement, et The Mothers perçoit une commission. The Mothers assure la réservation, applique la règle d'annulation indiquée sur la fiche et gère les remboursements pour le compte de l'organisateur. Certains événements de communauté ne sont visibles qu'à leurs membres via leur lien d'invitation."
            : lang === "es"
            ? "Los eventos marcados como «Con [nombre]» son realizados por una comunidad, estudio o negocio independiente, quien es responsable de llevarlos a cabo y, en eventos de pago, actúa como vendedor: pagas con tarjeta al reservar, el importe va al organizador mediante nuestra pasarela y The Mothers percibe una comisión. The Mothers gestiona las reservas, aplica la política de cancelación de la ficha y tramita los reembolsos en nombre del organizador. Algunos eventos de comunidad solo son visibles para sus miembros a través de su enlace de invitación."
            : "Events marked “With [name]” are run by an independent community, studio or business, who is responsible for delivering them and, for paid events, is the seller: you pay by card when you book, the payment goes to the organiser through our payment provider, and The Mothers receives a commission. The Mothers runs the booking, applies the cancellation rule shown on the card and handles refunds on the organiser’s behalf. Some community events are visible only to that community’s members, through its invite link.",
      },
      {
        n: "09",
        title: lang === "fr" ? "Rencontres organisées par les mères" : lang === "es" ? "Encuentros organizados por madres" : "Gatherings organised by mothers",
        body:
          lang === "fr"
            ? "Les événements intitulés « Rencontre par [nom] » sont organisés par un membre de la communauté, et non par The Mothers. Ils sont toujours gratuits, limités à 10 mères, et ne peuvent servir à aucune démarche commerciale. The Mothers vérifie les premières rencontres d'une mère et peut retirer toute rencontre, mais ne les anime pas et décline toute responsabilité quant à leur déroulement. Organiser une rencontre requiert d'avoir participé à au moins 3 événements et de n'avoir aucun no-show récent."
            : lang === "es"
            ? "Los eventos señalados como «Encuentro de [nombre]» son organizados por una madre de la comunidad, no por The Mothers. Siempre son gratuitos, limitados a 10 madres y no pueden utilizarse para vender. The Mothers revisa los primeros encuentros de cada madre y puede retirar cualquiera, pero no los coordina in situ ni se responsabiliza de lo ocurrido en ellos. Organizar un encuentro exige haber asistido a un mínimo de 3 eventos y no tener ningún no-show reciente."
            : "Events marked “Gathering by [name]” are organised by a member of the community, not by The Mothers. They are always free, limited to 10 mothers, and may not be used to sell anything. The Mothers checks a mother’s first gatherings and can remove any gathering, but does not run them and is not responsible for what happens there. Organising a gathering requires at least 3 events attended and no recent no-show.",
      },
      {
        n: "10",
        title: lang === "fr" ? "Rôle d'hôte" : lang === "es" ? "Ser anfitriona" : "Hosting",
        body:
          lang === "fr"
            ? "Certains événements sont indiqués comme nécessitant une hôte. Une hôte accueille les autres mères, arrive dix minutes à l'avance et fait les présentations. Pour être hôte, vous devez avoir participé à au moins deux événements et ne présenter aucun no-show au cours des trois derniers mois ; les demandes sont confirmées par l'équipe par email et peuvent être refusées. Une hôte dans l'incapacité de participer doit annuler dans la fenêtre d'annulation propre à l'événement ; une hôte qui annule tardivement, ou ne se présente pas, pourra de nouveau postuler après avoir assisté à trois événements supplémentaires."
            : lang === "es"
            ? "Algunos eventos se señalan como necesitados de anfitriona. La anfitriona da la bienvenida a las demás madres, llega diez minutos antes y hace las presentaciones. Para ser anfitriona necesitas haber asistido a dos eventos y no tener no-shows en los últimos tres meses; el equipo confirma las solicitudes por email y puede denegarlas. La anfitriona que no pueda asistir debe cancelar dentro del plazo del propio evento; si cancela más tarde o no asiste, solo podrá volver a ser anfitriona tras asistir a tres eventos más."
            : "Some events are marked as needing a host. A host welcomes the other mothers, arrives ten minutes early and makes the introductions. To host you need at least two events attended and no no-show in the last three months; requests are confirmed by the team by email and may be declined. A host who cannot attend should cancel within the event’s own cancellation window; a host who cancels later, or does not come, can host again after attending three more events.",
      },
      {
        n: "11",
        title: lang === "fr" ? "Professionnels recommandés, partenaires et avis" : lang === "es" ? "Profesionales recomendados, partners y reseñas" : "Recommended professionals, Partners and reviews",
        body:
          lang === "fr"
            ? "Les professionnels figurant dans la section Professionnels recommandés sont indépendants ; The Mothers procède à des vérifications mais n'est pas responsable des services qu'ils fournissent, tout contrat étant conclu directement entre vous et eux. Certains professionnels non médicaux sont Partenaires : lorsque vous utilisez leur code ou notre lien, The Mothers peut percevoir une commission. Les fiches Partenaires sont toujours expressément signalées, et la rémunération ne modifie en aucun cas l'ordre d'affichage. Les avis doivent refléter votre expérience personnelle ; les réponses « Pas pour moi » demeurent strictement privées. Nous nous réservons le droit de masquer les avis contraires aux présentes Conditions."
            : lang === "es"
            ? "Los profesionales listados en Profesionales recomendados son independientes; The Mothers los verifica pero no es responsable de los servicios prestados, formalizándose el contrato directamente entre el usuario y dicho profesional. Algunos profesionales no médicos son Partners: al usar su código o enlace, The Mothers puede percibir una comisión. Las fichas de Partner siempre van señalizadas y el pago nunca altera el orden del listado. Las reseñas deben reflejar una experiencia propia; las respuestas «No es para mí» son privadas. Podemos ocultar reseñas que vulneren estos Términos."
            : "Professionals listed on Recommended professionals are independent; The Mothers checks them but is not responsible for the services they provide, and any contract is between you and them. Some non-medical professionals are Partners: when you use their code or our link, The Mothers may earn a commission. Partner listings are always labelled, and payment never changes the order of the list. Reviews must describe your own experience; “Not for me” answers are private. We may hide reviews that break these Terms.",
      },
      {
        n: "12",
        title: lang === "fr" ? "Contenu sponsorisé" : lang === "es" ? "Contenido patrocinado" : "Sponsored content",
        body:
          lang === "fr"
            ? "Des marques peuvent sponsoriser un mois sur la page d'accueil ou un événement particulier. Les contenus sponsorisés portent systématiquement la mention « Sponsorisé »."
            : lang === "es"
            ? "Algunas marcas pueden patrocinar un mes en la portada o un evento individual. El contenido patrocinado siempre se identifica con la etiqueta «Patrocinado»."
            : "Brands may sponsor a month on the homepage or a single event. Sponsored content is always labelled “Sponsored”.",
      },
      {
        n: "13",
        title: lang === "fr" ? "Paiements" : lang === "es" ? "Pagos" : "Payments",
        body:
          lang === "fr"
            ? "Les crédits et événements payés par carte sont traités par notre prestataire de paiement sécurisé, qui conserve les coordonnées bancaires — nous ne les détenons pas. Rien sur ce site ne constitue un abonnement aujourd'hui : il n'y a aucun prélèvement récurrent. Les reçus sont transmis par email à chaque achat."
            : lang === "es"
            ? "Los créditos y eventos abonados con tarjeta se tramitan mediante nuestra pasarela de pago, que almacena y gestiona los datos de tarjeta sin que queden guardados en nuestros servidores. Actualmente nada en la web es una suscripción: no existen cobros recurrentes. Los recibos se envían por correo electrónico en el instante de la compra."
            : "Credits and card-paid events are paid through our payment provider, which handles and stores card details — we do not hold them. Nothing on this site is a subscription today: there is no recurring charge. Receipts are emailed at the moment of purchase.",
      },
      {
        n: "14",
        title: lang === "fr" ? "Adhésion future" : lang === "es" ? "Membresía futura" : "Membership, later",
        body:
          lang === "fr"
            ? "Nous pourrons ultérieurement proposer une adhésion payante — mensuelle ou annuelle — aux tarifs publiés sur le site à ce moment-là. Aucune date n'est fixée. L'adhésion apporte des avantages et fonctionnalités supplémentaires ; elle ne modifie pas le prix des événements. Il n'y a pas de frais d'inscription. L'ensemble des conditions, incluant annulation, suspensions temporaires et rappels de renouvellement, sera publié avant tout premier paiement."
            : lang === "es"
            ? "Más adelante podremos ofrecer una membresía de pago —mensual o anual— según las tarifas publicadas en la web en dicho momento. No hay fecha fijada. La membresía añade ventajas y funciones; no altera el precio de los eventos. No hay cuota de alta. Las condiciones íntegras, incluidas cancelaciones, pausas y avisos de renovación, se publicarán antes de solicitar pago alguno."
            : "We may later offer a paid membership — monthly or annual — at the prices published on the site at the time. No date is set. Membership adds perks and features; it does not change the price of events. There is no joining fee. The full terms, including cancellation, pauses and renewal reminders, will be published before anyone is asked to pay.",
      },
      {
        n: "15",
        title: lang === "fr" ? "Suspension et clôture de compte" : lang === "es" ? "Suspensión y cierre de cuenta" : "Suspension and closing an account",
        body:
          lang === "fr"
            ? "Nous pouvons suspendre tout compte enfreignant les présentes Conditions. Pendant la suspension, vous ne pouvez ni réserver, ni publier, ni envoyer de messages, ni organiser ; vos réservations et crédits sont gelés (non remboursés) et le motif vous est notifié par email. Vous pouvez supprimer votre compte à tout moment : les réservations futures sont annulées, les crédits restants sont perdus, vos messages sur Le Forum subsistent sans votre nom et les justificatifs de paiement sont archivés selon les obligations fiscales en vigueur."
            : lang === "es"
            ? "Podemos suspender cualquier cuenta que vulnere estos Términos. Durante la suspensión no podrás reservar, publicar, enviar mensajes ni organizar; las reservas y créditos quedan congelados sin reembolso, informándote del motivo por email. Puedes dar de baja tu cuenta en cualquier momento: se cancelan reservas futuras, se pierden créditos pendientes, tus aportaciones al Foro permanecen desprovistas de tu nombre y los justificantes de pago se conservan el tiempo exigido por la ley tributaria."
            : "We may suspend an account that breaks these Terms. While suspended you cannot book, post, message or organise; your bookings and credits are frozen, not refunded, and we will tell you why by email. You can delete your account at any time: future bookings are cancelled, remaining credits are forfeited, your Forum posts remain without your name, and payment records are kept as tax law requires.",
      },
      {
        n: "16",
        title: lang === "fr" ? "Propriété intellectuelle" : lang === "es" ? "Propiedad intelectual" : "Intellectual property",
        body:
          lang === "fr"
            ? "L'ensemble des textes, photographies, identités visuelles et éléments graphiques de ce site appartiennent à The Mothers ou sont utilisés avec autorisation. Toute reproduction ou réutilisation sans accord écrit préalable est formellement interdite."
            : lang === "es"
            ? "Todos los textos, fotografías, identidad corporativa y elementos de diseño de este sitio web pertenecen a The Mothers o se usan con licencia. Queda prohibida su reproducción o uso sin nuestro consentimiento previo por escrito."
            : "All text, photography, branding and design on this website belong to The Mothers or are used with permission. You may not reproduce or repurpose this content without our written consent.",
      },
      {
        n: "17",
        title: lang === "fr" ? "Limitation de responsabilité" : lang === "es" ? "Limitación de responsabilidad" : "Limitation of liability",
        body:
          lang === "fr"
            ? "The Mothers facilite les rencontres, événements et mises en relation en toute bonne foi, mais la participation à tout événement, rencontre ou service relève de votre libre appréciation et s'effectue sous votre propre responsabilité. Dans toute la mesure permise par la loi, The Mothers décline toute responsabilité pour tout dommage indirect ou consécutif qui en résulterait."
            : lang === "es"
            ? "The Mothers promueve la comunidad, los encuentros y las presentaciones de buena fe, pero la participación en cualquier evento, reunión o servicio se realiza bajo tu propio criterio y responsabilidad. En la medida en que la ley lo permita, The Mothers no responde de daños indirectos o perjuicios derivados de los mismos."
            : "The Mothers facilitates community, events and introductions in good faith, but taking part in any event, gathering or service is at your own discretion and risk. To the fullest extent permitted by law, The Mothers is not liable for indirect or consequential loss arising from it.",
      },
      {
        n: "18",
        title: lang === "fr" ? "Modifications et droit applicable" : lang === "es" ? "Modificaciones y legislación aplicable" : "Changes and governing law",
        body:
          lang === "fr"
            ? "Nous pouvons mettre à jour ces Conditions au fur et à mesure du développement du club et publierons toute révision ici avec la date mise à jour. Les présentes Conditions sont régies par le droit espagnol et tout litige relève de la compétence exclusive des tribunaux de Barcelone."
            : lang === "es"
            ? "Podemos actualizar estos Términos conforme evolucione el club, publicando cualquier revisión aquí con su fecha actualizada. Estos Términos se rigen por la legislación española, sometiéndose cualquier controversia a la jurisdicción de los tribunales de Barcelona."
            : "We may update these Terms as the club grows and will post any revision here with an updated date. These Terms are governed by the laws of Spain, and any dispute is subject to the courts of Barcelona.",
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
          {termsData.title}
        </h1>
        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.58)", margin: "0 0 22px" }}>
          {termsData.meta}
        </p>

        {termsData.convenienceNote && (
          <p style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.6)", margin: "-14px 0 22px" }}>
            {termsData.convenienceNote}
          </p>
        )}

        <p style={{ fontSize: "16px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.74)", margin: 0, textAlign: "justify" }}>
          {termsData.intro}
        </p>
      </section>

      {/* Sections List */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(16px, 2vw, 24px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)" }}>
        {termsData.sections.map((s) => (
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
