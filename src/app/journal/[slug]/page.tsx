"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";

interface ArticleDetail {
  id: string;
  cat: string;
  dateEn: string;
  dateEs: string;
  readEn: string;
  readEs: string;
  author: string;
  roleEn: string;
  roleEs: string;
  photoHint: string;
  titleEn: string;
  titleEs: string;
  dekEn: string;
  dekEs: string;
  quoteEn: string;
  quoteEs: string;
  bodyEn: string[];
  bodyEs: string[];
  bodyAfterEn: string[];
  bodyAfterEs: string[];
  bylineEn: string;
  bylineEs: string;
  reviewedNoteEn: string;
  reviewedNoteEs: string;
}

const ARTICLES_DETAILS: Record<string, ArticleDetail> = {
  doula: {
    id: "doula",
    cat: "postpartum",
    dateEn: "Aug 4, 2026",
    dateEs: "4 ago 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "Marta Vidal",
    roleEn: "postpartum doula, Eixample",
    roleEs: "doula posparto, Eixample",
    photoHint: "Photo — a doula and mother sitting together at a kitchen table, natural light",
    titleEn: "Finding a postpartum doula in Barcelona",
    titleEs: "Encontrar una doula posparto en Barcelona",
    dekEn: "What a doula actually does in the fourth trimester, what it costs here, and the questions worth asking before you book one.",
    dekEs: "Qué hace realmente una doula en el cuarto trimestre, cuánto cuesta aquí y qué conviene preguntar antes de contratarla.",
    quoteEn: "Ask her what she does when a mother cries. The answer tells you more than any certificate.",
    quoteEs: "Pregúntale qué hace cuando una madre llora. La respuesta dice más que cualquier certificado.",
    bodyEn: [
      "A postpartum doula is not a night nurse, not a cleaner, and not a midwife. She is someone who comes to your home in the weeks after birth and takes the weight off — the practical weight and the emotional one. In Barcelona she will usually work in blocks of three or four hours, once or twice a week, for the first six to twelve weeks.",
      "What that looks like in practice is unglamorous and enormously useful. She holds the baby while you shower. She watches you feed and notices the things you cannot see from where you are sitting. She cooks something you can eat with one hand. She tells you what is normal, which is the sentence most new mothers are starving for.",
      "Rates in the city sit broadly between €25 and €45 an hour, higher for overnight support, and many doulas sell packages rather than single visits. Ask what is included: some include a prenatal meeting and unlimited WhatsApp support between visits, which is often worth more than an extra hour in the house.",
      "Where to look, in rough order of usefulness: your midwife at the CAP, who often knows who works in your neighbourhood; the associations that certify doulas in Catalonia; your antenatal group; and lastly Instagram, where the presentation is polished and the vetting is yours to do."
    ],
    bodyEs: [
      "Una doula posparto no es una enfermera de noche, ni una limpiadora, ni una matrona. Es alguien que viene a tu casa en las semanas posteriores al parto y te quita peso — el práctico y el emocional. En Barcelona suele trabajar en bloques de tres o cuatro horas, una o dos veces por semana, durante las primeras seis a doce semanas.",
      "En la práctica es poco glamuroso y enormemente útil. Sostiene al bebé mientras te duchas. Te mira dar el pecho y ve lo que tú no puedes ver desde donde estás sentada. Cocina algo que puedas comer con una mano. Te dice qué es normal, que es la frase que más necesita oír una madre reciente.",
      "Las tarifas en la ciudad van más o menos de 25€ a 45€ la hora, más caro de noche, y muchas doulas venden paquetes en lugar de visitas sueltas. Pregunta qué incluye: algunas incluyen una visita prenatal y WhatsApp ilimitado entre sesiones, que a menudo vale más que una hora extra en casa.",
      "Dónde buscar, por orden de utilidad: tu matrona del CAP, que suele saber quién trabaja en tu barrio; las asociaciones que acreditan doulas en Cataluña; tu grupo de preparación al parto; y por último Instagram, donde la presentación es impecable y el filtro lo pones tú."
    ],
    bodyAfterEn: [
      "Three questions worth asking on the first call. What does a typical visit look like, hour by hour? What do you not do — is laundry in scope, are older siblings? And who covers you if you are ill on the day?",
      "One practical note: book earlier than feels necessary. Good doulas in Barcelona are often full six to eight weeks ahead, and the version of you who needs one is not the version of you with the energy to interview four strangers."
    ],
    bodyAfterEs: [
      "Tres preguntas para la primera llamada. ¿Cómo es una visita típica, hora a hora? ¿Qué no haces — entra la colada, entra la de los hermanos mayores? ¿Y quién te cubre si ese día estás enferma?",
      "Un apunte práctico: reserva antes de lo que parece necesario. Las buenas doulas en Barcelona suelen estar llenas con seis u ocho semanas de antelación, y la versión de ti que la necesitará no es la que tiene energía para entrevistar a cuatro desconocidas."
    ],
    bylineEn: "Written by Marta Vidal · Postpartum support series",
    bylineEs: "Escrito por Marta Vidal · Serie de apoyo posparto",
    reviewedNoteEn: "Reviewed by The Mothers Editorial",
    reviewedNoteEs: "Revisado por la redacción de The Mothers"
  },
  friends: {
    id: "friends",
    cat: "friendship",
    dateEn: "Jul 28, 2026",
    dateEs: "28 jul 2026",
    readEn: "5 min read",
    readEs: "5 min de lectura",
    author: "The Mothers",
    roleEn: "",
    roleEs: "",
    photoHint: "Photo — two mothers with strollers talking on a park path, seen from behind",
    titleEn: "Making mum friends in a city that isn't yours",
    titleEs: "Hacer amigas madres en una ciudad que no es la tuya",
    dekEn: "Why it is harder than anyone admits, and the three things that actually move a friendly acquaintance into a friend.",
    dekEs: "Por qué es más difícil de lo que se admite y las tres cosas que realmente convierten a una conocida en una amiga.",
    quoteEn: "The third time you see someone is when the conversation stops being about the babies.",
    quoteEs: "La tercera vez que ves a alguien es cuando la conversación deja de girar en torno a los bebés.",
    bodyEn: [
      "Moving to Barcelona with a baby, or having one shortly after arriving, produces a specific kind of loneliness. You are surrounded by people all day and speaking to almost none of them. The friendships you had at home ran on years of accumulated context; here you are starting from a shared bench in a playground.",
      "The first thing worth knowing is that proximity is not friendship, and most advice confuses the two. Joining a class puts you in a room with other mothers. It does not, on its own, produce anyone who will answer the phone at eleven at night.",
      "What does move things along is repetition. The same faces, at the same time, every week. Almost every real friendship formed in early motherhood comes from a recurring fixture rather than a one-off event, because the third conversation is where people stop performing.",
      "The second is asymmetry of effort. Somebody has to be the one who suggests the coffee, and in a group of tired strangers everyone is waiting for someone else to do it. Being that person feels exposing and works nearly every time."
    ],
    bodyEs: [
      "Mudarse a Barcelona con un bebé, o tenerlo poco después de llegar, produce un tipo específico de soledad. Estás rodeada de gente todo el día y no hablas con casi nadie. Las amistades que tenías en casa funcionaban con años de contexto acumulado; aquí empiezas desde un banco compartido en un parque.",
      "Lo primero que conviene saber es que la proximidad no es amistad, y la mayoría de los consejos confunden ambas cosas. Apuntarse a una clase te mete en una sala con otras madres. No produce, por sí solo, a nadie que te coja el teléfono a las once de la noche.",
      "Lo que sí hace avanzar las cosas es la repetición. Las mismas caras, a la misma hora, todas las semanas. Casi todas las amistades reales en la maternidad temprana surgen de un encuentro recurrente más que de un evento único, porque en la tercera conversación es donde la gente deja de actuar.",
      "Lo segundo es la asimetría del esfuerzo. Alguien tiene que ser quien proponga el café, y en un grupo de desconocidas cansadas todas esperan a que lo haga otra. Ser esa persona da pudor, pero funciona casi siempre."
    ],
    bodyAfterEn: [
      "The third is honesty, earlier than feels comfortable. The mothers who find their people quickly are usually the ones who answer \"how are you?\" truthfully in week two rather than in month six. It filters fast, in both directions, and what remains is real.",
      "Language matters less than people fear. Barcelona motherhood runs in Spanish, Catalan, English and a good deal of gesture, and nobody has ever been excluded from a park bench for imperfect grammar."
    ],
    bodyAfterEs: [
      "Lo tercero es la honestidad, antes de lo que resulta cómodo. Las madres que encuentran a su gente rápido suelen ser las que responden a \"¿cómo estás?\" con la verdad en la segunda semana en lugar de en el sexto mes. Filtra rápido, en ambas direcciones, y lo que queda es real.",
      "El idioma importa menos de lo que la gente teme. La maternidad en Barcelona funciona en castellano, catalán, inglés y muchos gestos, y a nadie se le ha excluido nunca de un banco del parque por una gramática imperfecta."
    ],
    bylineEn: "Written by The Mothers Editorial",
    bylineEs: "Escrito por la redacción de The Mothers",
    reviewedNoteEn: "Reviewed by The Mothers",
    reviewedNoteEs: "Revisado por The Mothers"
  },
  sleep: {
    id: "sleep",
    cat: "sleep",
    dateEn: "Jul 19, 2026",
    dateEs: "19 jul 2026",
    readEn: "7 min read",
    readEs: "7 min de lectura",
    author: "Dorm Bé Sleep Consultants",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — a dim bedroom at dawn, cot and a chair, no people",
    titleEn: "The first twelve weeks of sleep, honestly",
    titleEs: "Las primeras doce semanas de sueño, con honestidad",
    dekEn: "What is developmentally normal, what is not worth fixing yet, and the two things that genuinely help before three months.",
    dekEs: "Lo que es normal en el desarrollo, lo que no vale la pena arreglar todavía y las dos cosas que realmente ayudan antes de los tres meses.",
    quoteEn: "Under three months you are not building habits. You are keeping everyone alive until the rhythm arrives.",
    quoteEs: "Antes de los tres meses no estás creando hábitos. Estás manteniendo a todos con vida hasta que llegue el ritmo.",
    bodyEn: [
      "Almost everything sold as a sleep solution before three months is solving a problem that does not exist yet. A newborn sleeps in short cycles, wakes to feed, and has no circadian rhythm to speak of until somewhere between six and twelve weeks. None of that is a habit you are forming. It is biology running on schedule.",
      "This matters because the guilt is the heaviest part. Mothers arrive at consultations convinced they have ruined something by rocking a baby to sleep for eight weeks. They have not. Under three months there is no evidence that responding to a baby at night makes later sleep worse.",
      "Two things do help, and both are unexciting. The first is light: bright daylight in the morning and low light after dusk, which is the strongest signal available for building a day-night rhythm. Barcelona makes this easy — a walk before eleven is worth more than any product.",
      "The second is a short, repeated wind-down. Four or five minutes, the same order every night. It does nothing for a two-week-old and everything for a three-month-old, because you have spent the intervening weeks teaching a pattern."
    ],
    bodyEs: [
      "Casi todo lo que se vende como solución para el sueño antes de los tres meses resuelve un problema que aún no existe. Un recién nacido duerme en ciclos cortos, se despierta para comer y no tiene un ritmo circadiano como tal hasta pasadas entre seis y doce semanas. Nada de eso es un hábito que estés creando. Es biología siguiendo su curso.",
      "Esto importa porque la culpa es la parte más pesada. Las madres llegan a las consultas convencidas de haber arruinado algo por mecer al bebé para dormir durante ocho semanas. No es así. Antes de los tres meses no hay pruebas de que responder al bebé por la noche empeore el sueño posterior.",
      "Dos cosas sí ayudan, y ambas son sencillas. La primera es la luz: luz natural brillante por la mañana y luz tenue tras el anochecer, que es la señal más fuerte para crear el ritmo día-noche. Barcelona lo pone fácil: un paseo antes de las once vale más que cualquier producto.",
      "La segunda es una rutina corta de relajación repetida. Cuatro o cinco minutos, en el mismo orden cada noche. No sirve de nada para un bebé de dos semanas, pero lo es todo para uno de tres meses, porque has pasado las semanas intermedias enseñando un patrón."
    ],
    bodyAfterEn: [
      "What is worth a conversation with a professional: feeding that takes longer than 45 minutes every time, a baby who cannot be put down at all beyond the newborn weeks, snoring or noisy breathing in sleep, or a mother who is not sleeping even when the baby does. That last one is a health matter, not a sleep matter, and it is the one most often left too long.",
      "If you take one thing from this: the goal in the first twelve weeks is not a baby who sleeps through. It is a mother who gets one unbroken four-hour stretch, however that is arranged."
    ],
    bodyAfterEs: [
      "Lo que merece una consulta profesional: tomas que duran más de 45 minutos cada vez, un bebé al que no se puede dejar en absoluto pasada la etapa de recién nacido, ronquidos o respiración ruidosa al dormir, o una madre que no duerme incluso cuando el bebé lo hace. Esto último es un tema de salud, no de sueño, y es el que más a menudo se deja pasar.",
      "Si te quedas con una sola cosa de esto: el objetivo en las primeras doce semanas no es un bebé que duerma toda la noche. Es una madre que consiga un bloque ininterrumpido de cuatro horas de sueño, como quiera que se organice."
    ],
    bylineEn: "Written by Dorm Bé Consultants · Partner feature",
    bylineEs: "Escrito por Dorm Bé Consultants · Colaboración",
    reviewedNoteEn: "Reviewed by Dorm Bé Sleep",
    reviewedNoteEs: "Revisado por Dorm Bé Sleep"
  },
  feeding: {
    id: "feeding",
    cat: "feeding",
    dateEn: "Jul 8, 2026",
    dateEs: "8 jul 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "BabyLatch Consultants",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — mother feeding a baby in a bright living room, shot from the side",
    titleEn: "Feeding: the questions nobody answers at 3am",
    titleEs: "Lactancia: las preguntas que nadie responde a las 3 de la mañana",
    dekEn: "Pain, supply, mixed feeding and when to actually call someone — the practical answers, without the ideology.",
    dekEs: "Dolor, producción, lactancia mixta y cuándo llamar realmente a alguien: las respuestas prácticas, sin ideología.",
    quoteEn: "A fed baby and a mother who is still standing are the same goal, not competing ones.",
    quoteEs: "Un bebé alimentado y una madre que sigue en pie son el mismo objetivo, no metas contrapuestas.",
    bodyEn: [
      "Feeding is the area where new mothers receive the most advice and the least useful information. Everyone has an opinion and almost nobody tells you the specific thing you need at two in the morning, which is usually: is this normal, and if not, who do I call?",
      "Pain first, because it is the most misreported. Tenderness in the first week is common. Pain that makes you dread a feed, cracked or bleeding skin, or a pinching sensation that lasts through the feed is not something to wait out. It is nearly always a positioning issue or a latch issue, both of which are fixable, often in a single session.",
      "Supply is the second great source of night-time panic, and most of it is misplaced. A baby who is gaining weight, producing nappies and settling for at least part of the day is getting enough, whatever your breasts feel like. Softness is not emptiness. Cluster feeding in the evening is not failure.",
      "Mixed feeding deserves saying plainly: it is a legitimate choice, not a failure of nerve, and it keeps a great many mothers feeding for longer than they otherwise would. If a bottle at night is what makes the next three months survivable, that is a good reason."
    ],
    bodyEs: [
      "La alimentación es el área donde las madres recientes reciben más consejos y menos información útil. Todo el mundo tiene una opinión y casi nadie te dice lo específico que necesitas a las dos de la mañana, que suele ser: ¿es esto normal? Y si no, ¿a quién llamo?",
      "El dolor primero, por ser lo que peor se reporta. La sensibilidad en la primera semana es común. El dolor que te hace temer la toma, la piel agrietada o sangrante, o un pinchazo que dura toda la toma no es algo que debas aguantar. Casi siempre es un problema de postura o de agarre, y ambos se solucionan, a menudo en una sola sesión.",
      "La producción es la segunda fuente de pánico nocturno, y la mayor parte es infundada. Un bebé que gana peso, moja pañales y se queda tranquilo al menos parte del día está tomando lo suficiente, sientas como sientas los pechos. El pecho blando no significa vacío. Las tomas en racimo al atardecer no son un fracaso.",
      "La lactancia mixta merece decirse claramente: es una opción legítima, no un fracaso de voluntad, y hace que muchas madres sigan dando el pecho más tiempo del que aguantarían de otro modo. Si un biberón por la noche hace que los próximos tres meses sean llevaderos, es un buen motivo."
    ],
    bodyAfterEn: [
      "Who to call in Barcelona: your CAP midwife is the free first stop and can refer you onward. Private lactation consultants, IBCLC-certified, charge roughly €70 to €110 for a home visit — expensive in a hard week, cheap against three months of dread. La Liga de la Leche runs free peer groups in several neighbourhoods.",
      "Call sooner than you think you should. Almost every feeding problem is easier to solve at day four than at week four, and the mothers who wait rarely wait because the problem is small."
    ],
    bodyAfterEs: [
      "A quién llamar en Barcelona: la matrona de tu CAP es la primera opción gratuita y puede derivarte. Las asesoras de lactancia privadas certificadas (IBCLC) cobran entre 70€ y 110€ por visita a domicilio — caro en una semana difícil, barato comparado con tres meses de angustia. La Liga de la Leche organiza grupos gratuitos en varios barrios.",
      "Llama antes de lo que creas necesario. Casi todos los problemas de lactancia son más fáciles de resolver al cuarto día que a la cuarta semana, y las madres que esperan rara vez lo hacen porque el problema sea pequeño."
    ],
    bylineEn: "Written by BabyLatch Consultants · Partner feature",
    bylineEs: "Escrito por BabyLatch Consultants · Colaboración",
    reviewedNoteEn: "Reviewed by BabyLatch",
    reviewedNoteEs: "Revisado por BabyLatch"
  },
  yoga: {
    id: "yoga",
    cat: "body",
    dateEn: "Jun 30, 2026",
    dateEs: "30 jun 2026",
    readEn: "4 min read",
    readEs: "4 min de lectura",
    author: "Loto Barcelona Yoga",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — a small prenatal yoga class, mats and bolsters, warm light",
    titleEn: "Prenatal yoga in Barcelona: what to ask before you book",
    titleEs: "Yoga prenatal en Barcelona: qué preguntar antes de reservar",
    dekEn: "Not all prenatal classes are prenatal classes. Five questions that tell you whether the teacher in front of you is trained for a pregnant body.",
    dekEs: "No todas las clases prenatales son lo mismo. Cinco preguntas que te dirán si la profesora está formada para un cuerpo gestante.",
    quoteEn: "A teacher who cannot tell you what changes at 34 weeks has not been trained for the body in front of her.",
    quoteEs: "Una profesora que no sabe qué cambia a las 34 semanas no está formada para el cuerpo que tiene delante.",
    bodyEn: [
      "Prenatal yoga is not a regulated term. A studio can put the word on a timetable with a teacher who has done a weekend module, and much of the city does exactly that. The difference matters more in the third trimester than the first, and it is not visible from the schedule.",
      "Ask what training the teacher has specifically for pregnancy, and how many hours it ran. A credible answer is a named course of 85 hours or more. A vague answer about years of general experience is not the same thing.",
      "Ask how the class changes by trimester. A teacher who is genuinely trained will describe different work in each — mobility and breath early, stability and pelvic-floor awareness later, and a real shift in what is offered after about 34 weeks.",
      "Ask about the pelvic floor directly. The good answer covers both directions: releasing as well as strengthening. A class that only does Kegels is missing half the work, and the release half is the half that matters for birth."
    ],
    bodyEs: [
      "El yoga prenatal no es un término regulado. Un estudio puede poner esa palabra en su horario con una profesora que haya hecho un curso de fin de semana, y gran parte de la ciudad hace exactamente eso. La diferencia importa más en el tercer trimestre que en el primero, y no se aprecia en el folleto.",
      "Pregunta qué formación específica en embarazo tiene la profesora y de cuántas horas fue. Una respuesta creíble es un curso certificado de 85 horas o más. Una respuesta vaga sobre años de experiencia general no es lo mismo.",
      "Pregunta cómo cambia la clase según el trimestre. Una profesora bien formada describirá un trabajo diferente en cada uno: movilidad y respiración al principio; estabilidad y conciencia del suelo pélvico después, y un cambio real en lo que se propone a partir de la semana 34.",
      "Pregunta directamente sobre el suelo pélvico. La respuesta correcta incluye ambas direcciones: relajar y también fortalecer. Una clase que solo hace Kegels se está perdiendo la mitad del trabajo, y la parte de relajación es la que más importa para el parto."
    ],
    bodyAfterEn: [
      "Ask about class size and whether she adjusts hands-on. Twelve is a lot of pregnant bodies for one teacher to watch. Six to eight, with someone who moves around the room, is worth paying more for.",
      "And ask what happens afterwards — whether there is a postnatal class, whether babies are welcome, and whether the people in the room tend to stay in touch. The yoga is the reason you book. The room of women at the same stage is often what you actually keep."
    ],
    bodyAfterEs: [
      "Pregunta por el tamaño de la clase y si hace correcciones físicas. Doce es un número elevado de embarazadas para una sola profesora. Pagar más por una clase de seis a ocho alumnas, con alguien que se mueva por la sala, vale la pena.",
      "Y pregunta qué pasa después: si hay clase posnatal, si los bebés son bienvenidos y si las asistentes suelen mantener el contacto. El yoga es la excusa para reservar. La sala llena de mujeres en tu misma etapa suele ser lo que de verdad te llevas."
    ],
    bylineEn: "Written by Loto Barcelona Yoga · Partner feature",
    bylineEs: "Escrito por Loto Barcelona Yoga · Colaboración",
    reviewedNoteEn: "Reviewed by Loto Yoga",
    reviewedNoteEs: "Revisado por Loto Yoga"
  },
  work: {
    id: "work",
    cat: "work",
    dateEn: "Jun 17, 2026",
    dateEs: "17 jun 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "Momentum Careers Barcelona",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — a desk with a laptop and a coffee, morning light, Barcelona apartment",
    titleEn: "Going back to work: the conversations to have first",
    titleEs: "Volver al trabajo: las conversaciones que debes tener primero",
    dekEn: "Before the logistics, three conversations that decide how the return actually goes — with your employer, your partner, and yourself.",
    dekEs: "Antes de la logística, tres conversaciones que deciden cómo va realmente el regreso: con tu empresa, tu pareja y contigo misma.",
    quoteEn: "Ask who the nursery calls. That question decides more of your year than the rota does.",
    quoteEs: "Pregunta a quién llama la guardería. Esa pregunta decide más sobre tu año que cualquier cuadrante de tareas.",
    bodyEn: [
      "Most return-to-work advice starts with childcare and calendars. Those matter, but they are downstream. The returns that go well are the ones where three conversations happened before the first day back, and the returns that go badly are almost always missing one of them.",
      "The first is with your employer, and it should be specific rather than grateful. Not \"I am hoping to come back three days\" but a proposal: which days, how handovers work, what you will own, and when you will review it. Vagueness invites someone else to decide, and the person deciding will not be thinking about your evenings.",
      "In Spain there are real entitlements worth knowing before that conversation — reduced hours, adapted schedules, breastfeeding leave. Rules change and they depend on your contract and your convenio, so check the current position with your HR department, your works council or a labour lawyer rather than with the internet. Go into the meeting knowing what you are entitled to ask for.",
      "The second conversation is with your partner, if you have one, and it is about defaults rather than tasks. Not who does the nursery run this Tuesday, but who is the person the nursery calls when a child is ill. Whoever holds that default absorbs every unplanned hour, and it is worth naming out loud rather than discovering by attrition."
    ],
    bodyEs: [
      "La mayoría de los consejos para volver al trabajo empiezan con el cuidado infantil y los calendarios. Importan, pero van después. Los regresos que van bien son aquellos en los que se han tenido tres conversaciones antes del primer día, y los que van mal casi siempre fallan en alguna.",
      "La primera es con tu empresa, y debe ser específica más que de agradecimiento. No un \"espero volver tres días\" sino una propuesta: qué días, cómo se hacen los traspasos, de qué te harás cargo y cuándo se revisará. La vaguedad invita a que decida otro, y quien decida no pensará en tus tardes.",
      "En España existen derechos reales que conviene conocer antes de esa reunión: reducción de jornada, adaptación de horario, lactancia. Las normas cambian y dependen de tu contrato y convenio, así que consulta tu situación con RRHH, el comité o un abogado laboralista antes que con internet. Ve a la reunión sabiendo qué tienes derecho a solicitar.",
      "La segunda conversación es con tu pareja, si la tienes, y es sobre valores predeterminados más que sobre tareas. No quién lleva al niño a la guardería este martes, sino a quién llama la guardería cuando el niño se pone malo. Quien asuma esa llamada absorbe cada imprevisto, y conviene acordarlo antes de que ocurra por inercia."
    ],
    bodyAfterEn: [
      "The third is with yourself, and it is the one people skip. What does a good version of this look like in six months? Sometimes it is the same job on fewer days. Sometimes it is a different job entirely, and the honest answer arrives long before anyone acts on it.",
      "One practical thing: build a week of overlap if you possibly can. Childcare starting a week before you do turns the first day back from a cliff into a step, and it is the single change returning mothers most often say they wish they had made."
    ],
    bodyAfterEs: [
      "La tercera es contigo misma, y es la que se suele omitir. ¿Qué aspecto tiene una buena versión de esto dentro de seis meses? A veces es el mismo trabajo con menos días. A veces es un trabajo totalmente diferente, y la respuesta honesta llega mucho antes de que des el paso.",
      "Un detalle práctico: planifica una semana de solapamiento si puedes. Que el cuidado infantil empiece una semana antes que tú convierte el primer día de trabajo en un escalón y no en un precipicio, y es el cambio que las madres trabajadoras más desearían haber hecho."
    ],
    bylineEn: "Written by Momentum Careers Barcelona · Partner feature",
    bylineEs: "Escrito por Momentum Careers Barcelona · Colaboración",
    reviewedNoteEn: "Reviewed by Momentum Careers",
    reviewedNoteEs: "Revisado por Momentum Careers"
  }
};

const CATEGORIES = {
  all: { labelEn: "All", labelEs: "Todo" },
  postpartum: { labelEn: "Postpartum", labelEs: "Posparto" },
  friendship: { labelEn: "Friendship", labelEs: "Amistad" },
  sleep: { labelEn: "Sleep", labelEs: "Sueño" },
  feeding: { labelEn: "Feeding", labelEs: "Lactancia" },
  body: { labelEn: "Body", labelEs: "Cuerpo" },
  work: { labelEn: "Work", labelEs: "Trabajo" },
};

export default function JournalSinglePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [lang, setLang] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as Locale);
  }, []);

  const post = ARTICLES_DETAILS[slug];

  if (!post) {
    return (
      <div style={{ backgroundColor: "#f8efe2", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px) 100px", fontFamily: "'Lora', Georgia, serif", color: "#39292a" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <Link href="/journal" style={{ color: "rgba(57, 41, 42, 0.6)", fontSize: "14px", textDecoration: "none" }}>
              ← {lang === "en" ? "Back to Journal" : "Volver al Diario"}
            </Link>
          </div>
          <p style={{ color: "rgba(57, 41, 42, 0.6)" }}>
            {lang === "en" ? "Article not found." : "Artículo no encontrado."}
          </p>
        </div>
      </div>
    );
  }

  const categoryLabel = lang === "en"
    ? CATEGORIES[post.cat as keyof typeof CATEGORIES]?.labelEn || post.cat
    : CATEGORIES[post.cat as keyof typeof CATEGORIES]?.labelEs || post.cat;

  const dateStr = lang === "en" ? post.dateEn : post.dateEs;
  const readTime = lang === "en" ? post.readEn : post.readEs;
  const title = lang === "en" ? post.titleEn : post.titleEs;
  const dek = lang === "en" ? post.dekEn : post.dekEs;
  const quote = lang === "en" ? post.quoteEn : post.quoteEs;
  const body = lang === "en" ? post.bodyEn : post.bodyEs;
  const bodyAfter = lang === "en" ? post.bodyAfterEn : post.bodyAfterEs;
  const byline = lang === "en" ? post.bylineEn : post.bylineEs;
  const reviewedNote = lang === "en" ? post.reviewedNoteEn : post.reviewedNoteEs;

  return (
    <div style={{ backgroundColor: "#f8efe2", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px) 100px", fontFamily: "'Lora', Georgia, serif", color: "#39292a" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <Link
            href="/journal"
            style={{
              color: "rgba(57, 41, 42, 0.6)",
              fontSize: "13.5px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px"
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            {lang === "en" ? "Back to Journal" : "Volver al Diario"}
          </Link>
        </div>

        <article
          style={{
            backgroundColor: "#fffdfa",
            padding: "clamp(32px, 5vw, 56px)",
            border: "1px solid rgba(57, 41, 42, 0.16)",
            borderRadius: "8px"
          }}
        >
          {/* Category and read time */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b1f2c", border: "1px solid rgba(123,31,44,0.35)", borderRadius: "12px", padding: "4px 11px" }}>
              {categoryLabel}
            </span>
            <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.5)" }}>
              {dateStr} · {readTime}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(34px, 4.6vw, 54px)",
              lineHeight: "1.08",
              letterSpacing: "-0.01em",
              margin: "0 0 18px",
            }}
          >
            {title}
          </h1>

          {/* Excerpt / Dek */}
          <p style={{ fontSize: "19px", lineHeight: "1.65", color: "rgba(57, 41, 42, 0.72)", margin: "0 0 30px", fontStyle: "italic" }}>
            {dek}
          </p>

          {/* Main image placeholder */}
          <div style={{ width: "100%", height: "clamp(240px, 32vw, 400px)", backgroundColor: "rgba(57, 41, 42, 0.04)", border: "1px solid rgba(57, 41, 42, 0.12)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", boxSizing: "border-box", textAlign: "center", marginBottom: "34px" }}>
            <span style={{ fontSize: "14px", fontStyle: "italic", color: "rgba(57,41,42,0.5)" }}>{post.photoHint}</span>
          </div>

          {/* Body paragraphs before quote */}
          <div style={{ fontSize: "17px", lineHeight: "1.8", color: "#39292a", display: "flex", flexDirection: "column", gap: "22px" }}>
            {body.map((para, idx) => (
              <p key={idx} style={{ margin: 0 }}>
                {para}
              </p>
            ))}
          </div>

          {/* Blockquote */}
          <blockquote
            style={{
              borderLeft: "2px solid #7b1f2c",
              margin: "34px 0",
              padding: "4px 0 4px 24px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: "1.35",
              color: "#7b1f2c",
            }}
          >
            {quote}
          </blockquote>

          {/* Body paragraphs after quote */}
          <div style={{ fontSize: "17px", lineHeight: "1.8", color: "#39292a", display: "flex", flexDirection: "column", gap: "22px" }}>
            {bodyAfter.map((para, idx) => (
              <p key={idx} style={{ margin: 0 }}>
                {para}
              </p>
            ))}
          </div>

          {/* Byline */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "baseline", justifyContent: "space-between", borderTop: "1px solid rgba(57, 41, 42, 0.16)", marginTop: "34px", paddingTop: "20px" }}>
            <div style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.7)" }}>{byline}</div>
            <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)" }}>{reviewedNote}</div>
          </div>

          {/* Bottom Call-To-Action Box matching mockup */}
          <div
            style={{
              border: "1px solid rgba(57, 41, 42, 0.2)",
              background: "#f8efe2",
              borderRadius: "6px",
              padding: "clamp(22px, 3vw, 32px)",
              marginTop: "36px"
            }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "10px" }}>
              {lang === "en" ? "Private circle" : "Círculo privado"}
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "26px", lineHeight: "1.2", margin: "0 0 10px" }}>
              {lang === "en" ? "A village of your own, in Barcelona." : "Una tribu propia, en Barcelona."}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: "1.65", color: "rgba(57, 41, 42, 0.72)", margin: "0 0 20px", maxWidth: "36em" }}>
              {lang === "en"
                ? "Weekly gatherings, neighbourhood threads, and a room of women at the same stage. We open applications in Windows, once a month."
                : "Encuentros semanales, hilos por barrio y una sala llena de madres en tu misma etapa. Abrimos solicitudes en Ventanas, una vez al mes."}
            </p>
            <Link
              href="/membership"
              style={{
                display: "inline-block",
                border: "1px solid #7b1f2c",
                background: "#7b1f2c",
                color: "#f8efe2",
                padding: "12px 24px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none"
              }}
            >
              {lang === "en" ? "Apply to join" : "Solicitar plaza"}
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
