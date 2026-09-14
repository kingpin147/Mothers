import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SEED_POSTS = [
  {
    slug: "fourth-trimester",
    category: "postpartum",
    title: "What nobody tells you about the fourth trimester",
    title_es: "Lo que nadie te cuenta sobre el cuarto trimestre",
    excerpt: "Three mothers on the first twelve weeks, and what they wish they had known.",
    excerpt_es: "Tres madres sobre las primeras doce semanas y lo que les hubiera gustado saber.",
    quote_en: "Ask her what she does when a mother cries. The answer tells you more than any certificate.",
    quote_es: "Pregúntale qué hace cuando una madre llora. La respuesta dice más que cualquier certificado.",
    body: "A postpartum doula is not a night nurse, not a cleaner, and not a midwife. She is someone who comes to your home in the weeks after birth and takes the weight off — the practical weight and the emotional one. In Barcelona she will usually work in blocks of three or four hours, once or twice a week, for the first six to twelve weeks.\n\nWhat that looks like in practice is unglamorous and enormously useful. She holds the baby while you shower. She watches you feed and notices the things you cannot see from where you are sitting. She cooks something you can eat with one hand. She tells you what is normal, which is the sentence most new mothers are starving for.\n\nRates in the city sit broadly between €25 and €45 an hour, higher for overnight support, and many doulas sell packages rather than single visits. Ask what is included: some include a prenatal meeting and unlimited WhatsApp support between visits, which is often worth more than an extra hour in the house.\n\nWhere to look, in rough order of usefulness: your midwife at the CAP, who often knows who works in your neighbourhood; the associations that certify doulas in Catalonia; your antenatal group; and lastly Instagram, where the presentation is polished and the vetting is yours to do.\n\nThree questions worth asking on the first call. What does a typical visit look like, hour by hour? What do you not do — is laundry in scope, are older siblings? And who covers you if you are ill on the day?\n\nOne practical note: book earlier than feels necessary. Good doulas in Barcelona are often full six to eight weeks ahead, and the version of you who needs one is not the version of you with the energy to interview four strangers.",
    body_es: "Una doula posparto no es una enfermera de noche, ni una limpiadora, ni una matrona. Es alguien que viene a tu casa en las semanas posteriores al parto y te quita peso — el práctico y el emocional. En Barcelona suele trabajar en bloques de tres o cuatro horas, una o dos veces por semana, durante las primeras seis a doce semanas.\n\nEn la práctica es poco glamuroso y enormemente útil. Sostiene al bebé mientras te duchas. Te mira dar el pecho y ve lo que tú no puedes ver desde donde estás sentada. Cocina algo que puedas comer con una mano. Te dice qué es normal, que es la frase que más necesita oír una madre reciente.\n\nLas tarifas en la ciudad van más o menos de 25€ a 45€ la hora, más caro de noche, y muchas doulas venden paquetes en lugar de visitas sueltas. Pregunta qué incluye: algunas incluyen una visita prenatal y WhatsApp ilimitado entre sesiones, que a menudo vale más que una hora extra en casa.\n\nDónde buscar, por orden de utilidad: tu matrona del CAP, que suele saber quién trabaja en tu barrio; las asociaciones que acreditan doulas en Cataluña; tu grupo de preparación al parto; y por último Instagram, donde la presentación es impecable y el filtro lo pones tú.\n\nTres preguntas para la primera llamada. ¿Cómo es una visita típica, hora a hora? ¿Qué no haces — entra la colada, entran los hermanos mayores? ¿Y quién te cubre si ese día estás enferma?\n\nUn apunte práctico: reserva antes de lo que parece necesario. Las buenas doulas en Barcelona suelen estar llenas con seis u ocho semanas de antelación, y la versión de ti que la necesitará no es la que tiene energía para entrevistar a cuatro desconocidas.",
    author: "Belén Costa",
    author_role_en: "Founder & Editor",
    author_role_es: "Fundadora y Editora",
    byline_en: "Written by Belén Costa · Postpartum Series",
    byline_es: "Escrito por Belén Costa · Serie Posparto",
    audience: "public",
    status: "published",
    published_at: new Date("2026-08-26T09:00:00Z"),
    views: 1840,
  },
  {
    slug: "making-mum-friends",
    category: "friendship",
    title: "Making mum friends in a city that isn't yours",
    title_es: "Hacer amigas madres en una ciudad que no es la tuya",
    excerpt: "Why it is harder than anyone admits, and the three things that actually move a friendly acquaintance into a friend.",
    excerpt_es: "Por qué cuesta más de lo que nadie admite, y las tres cosas que convierten a una conocida amable en una amiga.",
    quote_en: "The third time you see someone is when the conversation stops being about the babies.",
    quote_es: "La tercera vez que ves a alguien es cuando la conversación deja de girar en torno a los bebés.",
    body: "Moving to Barcelona with a baby, or having one shortly after arriving, produces a specific kind of loneliness. You are surrounded by people all day and speaking to almost none of them. The friendships you had at home ran on years of accumulated context; here you are starting from a shared bench in a playground.\n\nThe first thing worth knowing is that proximity is not friendship, and most advice confuses the two. Joining a class puts you in a room with other mothers. It does not, on its own, produce anyone who will answer the phone at eleven at night.\n\nWhat does move things along is repetition. The same faces, at the same time, every week. Almost every real friendship formed in early motherhood comes from a recurring fixture rather than a one-off event, because the third conversation is where people stop performing.\n\nThe second is asymmetry of effort. Somebody has to be the one who suggests the coffee, and in a group of tired strangers everyone is waiting for someone else to do it. Being that person feels exposing and works nearly every time.\n\nThe third is honesty, earlier than feels comfortable. The mothers who find their people quickly are usually the ones who answer 'how are you?' truthfully in week two rather than in month six. It filters fast, in both directions, and what remains is real.\n\nLanguage matters less than people fear. Barcelona motherhood runs in Spanish, Catalan, English and a good deal of gesture, and nobody has ever been excluded from a park bench for imperfect grammar.",
    body_es: "Mudarse a Barcelona con un bebé, o tenerlo poco después de llegar, produce un tipo específico de soledad. Estás rodeada de gente todo el día y no hablas con casi nadie. Las amistades que tenías en casa funcionaban con años de contexto acumulado; aquí empiezas desde un banco compartido en un parque.\n\nLo primero que conviene saber es que la proximidad no es amistad, y la mayoría de los consejos confunden ambas cosas. Apuntarse a una clase te mete en una sala con otras madres. No produce, por sí solo, a nadie que te coja el teléfono a las once de la noche.\n\nLo que sí hace avanzar las cosas es la repetición. Las mismas caras, a la misma hora, todas las semanas. Casi todas las amistades reales en la maternidad temprana surgen de un encuentro recurrente más que de un evento único, porque en la tercera conversación es donde la gente deja de actuar.\n\nLo segundo es la asimetría del esfuerzo. Alguien tiene que ser quien proponga el café, y en un grupo de desconocidas cansadas todas esperan a que lo haga otra. Ser esa persona da pudor, pero funciona casi siempre.\n\nLo tercero es la honestidad, antes de lo que resulta cómodo. Las madres que encuentran a su gente rápido suelen ser las que responden a '¿cómo estás?' con la verdad en la segunda semana en lugar de en el sexto mes. Filtra rápido, en ambas direcciones, y lo que queda es real.\n\nEl idioma importa menos de lo que la gente teme. La maternidad en Barcelona funciona en castellano, catalán, inglés y muchos gestos, y a nadie se le ha excluido nunca de un banco del parque por una gramática imperfecta.",
    author: "The Mothers",
    author_role_en: "Editorial Team",
    author_role_es: "Equipo Editorial",
    byline_en: "Written by The Mothers Editorial",
    byline_es: "Escrito por la redacción de The Mothers",
    audience: "public",
    status: "published",
    published_at: new Date("2026-07-28T09:00:00Z"),
    views: 2610,
  },
  {
    slug: "first-twelve-weeks-sleep",
    category: "sleep",
    title: "The first twelve weeks of sleep, honestly",
    title_es: "Las primeras doce semanas de sueño, sin cuentos",
    excerpt: "What is developmentally normal, what is not worth fixing yet, and the two things that genuinely help before three months.",
    excerpt_es: "Qué es normal en el desarrollo, qué no merece la pena arreglar todavía y las dos cosas que de verdad ayudan antes de los tres meses.",
    quote_en: "Under three months you are not building habits. You are keeping everyone alive until the rhythm arrives.",
    quote_es: "Antes de los tres meses no estás creando hábitos. Estás sosteniendo a todo el mundo hasta que llegue el ritmo.",
    body: "Almost everything sold as a sleep solution before three months is solving a problem that does not exist yet. A newborn sleeps in short cycles, wakes to feed, and has no circadian rhythm to speak of until somewhere between six and twelve weeks. None of that is a habit you are forming. It is biology running on schedule.\n\nThis matters because the guilt is the heaviest part. Mothers arrive at consultations convinced they have ruined something by rocking a baby to sleep for eight weeks. They have not. Under three months there is no evidence that responding to a baby at night makes later sleep worse.\n\nTwo things do help, and both are unexciting. The first is light: bright daylight in the morning and low light after dusk, which is the strongest signal available for building a day-night rhythm. Barcelona makes this easy — a walk before eleven is worth more than any product.\n\nThe second is a short, repeated wind-down. Four or five minutes, the same order every night. It does nothing for a two-week-old and everything for a three-month-old, because you have spent the intervening weeks teaching a pattern.\n\nWhat is worth a conversation with a professional: feeding that takes longer than 45 minutes every time, a baby who cannot be put down at all beyond the newborn weeks, snoring or noisy breathing in sleep, or a mother who is not sleeping even when the baby does. That last one is a health matter, not a sleep matter, and it is the one most often left too long.\n\nIf you take one thing from this: the goal in the first twelve weeks is not a baby who sleeps through. It is a mother who gets one unbroken four-hour stretch, however that is arranged.",
    body_es: "Casi todo lo que se vende como solución de sueño antes de los tres meses resuelve un problema que aún no existe. Un recién nacido duerme en ciclos cortos, se despierta para comer y no tiene apenas ritmo circadiano hasta algún punto entre las seis y las doce semanas. Nada de eso es un hábito que estés creando. Es biología funcionando a su hora.\n\nEsto importa porque la culpa es la parte más pesada. Llegan a consulta madres convencidas de haber estropeado algo por dormir a su bebé en brazos durante ocho semanas. No lo han hecho. Por debajo de los tres meses no hay evidencia de que atender a un bebé por la noche empeore su sueño posterior.\n\nDos cosas sí ayudan, y ninguna es emocionante. La primera es la luz: claridad por la mañana y penumbra al caer la tarde, que es la señal más potente disponible para construir el ritmo día-noche. Barcelona lo pone fácil — un paseo antes de las once vale más que cualquier producto.\n\nLa segunda es una rutina breve y repetida. Cuatro o cinco minutos, en el mismo orden cada noche. No hace nada por un bebé de dos semanas y lo hace todo por uno de tres meses, porque has pasado las semanas intermedias enseñando un patrón.\n\nCuándo conviene hablar con una profesional: tomas que duran más de 45 minutos siempre, un bebé al que no se puede dejar en ningún momento pasadas las primeras semanas, ronquidos o respiración ruidosa al dormir, o una madre que no duerme ni cuando el bebé duerme. Esto último es un asunto de salud, no de sueño, y es el que más se deja pasar.\n\nSi te quedas con una idea: el objetivo de las primeras doce semanas no es un bebé que duerma del tirón. Es una madre que consiga un tramo de cuatro horas seguidas, organizado como sea.",
    author: "Dorm Bé Sleep Consultants",
    author_role_en: "Partner · Sleep Specialists",
    author_role_es: "Partner · Especialistas en Sueño",
    byline_en: "Written by Dorm Bé Consultants · Partner feature",
    byline_es: "Escrito por Dorm Bé Consultants · Colaboración",
    audience: "public",
    status: "published",
    published_at: new Date("2026-07-19T09:00:00Z"),
    views: 940,
  },
  {
    slug: "a-night-off",
    category: "friendship",
    title: "A night off, and the guilt that comes with it",
    title_es: "Una noche libre y la culpa que la acompaña",
    excerpt: "On leaving the house without them, and coming back a better mother for it.",
    excerpt_es: "Sobre salir de casa sin ellos y volver siendo una mejor madre por ello.",
    quote_en: "Leaving the room does not make you less of a mother. It makes you a rested one.",
    quote_es: "Salir de la habitación no te hace menos madre. Te hace una madre descansada.",
    body: "The hardest part of taking an evening to yourself in the first six months is not the logistics of expressing or the handover notes on the counter. It is the distinct, irrational weight that settles between your shoulder blades the moment the front door clicks shut.\n\nYou spend the first hour checking your phone every seven minutes. You wonder if the bedtime routine broke down, if the baby cried until she choked, if the person watching her is secretly judging how you set up the crib. None of these things are happening, but the adrenaline does not care about facts.\n\nAround the second hour, if you are with other mothers, someone says something funny and you laugh from the belly. And then a second wave of guilt arrives: how can I enjoy this glass of wine when my baby is four kilometres away?\n\nHere is what nobody tells you about that night off: the person who walks back through the door at eleven is not the same exhausted, frayed woman who left at seven. She has breathing room. She has context. And when the baby wakes at three in the morning, she has the patience to hold her without resentment.",
    body_es: "La parte más difícil de tomarte una tarde para ti en los primeros seis meses no es la logística de extraerte leche ni las notas sobre la encimera. Es el peso irracional que se asienta entre tus hombros en el momento en que la puerta principal se cierra.\n\nPasas la primera hora mirando el móvil cada siete minutos. Te preguntas si la rutina de dormir se vino abajo, si el bebé lloró hasta atragantarse, si la persona que lo cuida te está juzgando en secreto. Nada de eso está pasando, pero la adrenalina no entiende de hechos.\n\nHacia la segunda hora, si estás con otras madres, alguien dice algo gracioso y te ríes de verdad. Y entonces llega una segunda ola de culpa: ¿cómo puedo estar disfrutando de esta copa de vino cuando mi bebé está a cuatro kilómetros?\n\nEsto es lo que nadie te cuenta de esa noche libre: la persona que vuelve a entrar por la puerta a las once no es la misma mujer agotada que salió a las siete. Ha respirado. Tiene perspectiva. Y cuando el bebé se despierta a las tres de la mañana, tiene la paciencia para sostenerlo sin resentimiento.",
    author: "Nuria Batlle",
    author_role_en: "Member · Gràcia",
    author_role_es: "Miembro · Gràcia",
    byline_en: "Written by Nuria Batlle · From the members",
    byline_es: "Escrito por Nuria Batlle · De nuestras socias",
    audience: "members_only",
    status: "published",
    published_at: new Date("2026-08-05T09:00:00Z"),
    views: 317,
  },
  {
    slug: "pelvic-floor-conversation",
    category: "body",
    title: "The pelvic floor conversation nobody starts",
    title_es: "La conversación sobre el suelo pélvico que nadie empieza",
    excerpt: "Luz Movement Studio on what to expect, and when to ask for help.",
    excerpt_es: "Luz Movement Studio sobre qué esperar y cuándo pedir ayuda profesional.",
    quote_en: "A pelvic floor that only knows how to clench is half-trained. The release is what protects you during birth.",
    quote_es: "Un suelo pélvico que solo sabe contraerse está a medio entrenar. La relajación es lo que te protege en el parto.",
    body: "Pelvic floor health is the most neglected topic in antenatal care until something hurts or stops working properly. Most women are told simply to 'do your Kegels' without any assessment of whether their pelvic floor muscles are hypertonic (too tight) or hypotonic (too weak).\n\nIn our studio in Poblenou, we see that nearly half the pregnant women who come through our doors actually need down-training: learning how to consciously soften and release the pelvic diaphragm in coordination with deep exhalations. Squeezing a tight muscle makes it tighter, which can lengthen labour and increase perineal tearing.\n\nWhen to book an assessment with a specialised physiotherapist in Barcelona: around week 20 of pregnancy for a baseline check, and between 6 and 8 weeks postpartum before returning to any high-impact exercise, running, or heavy lifting.",
    body_es: "La salud del suelo pélvico es el tema más desatendido en el cuidado prenatal hasta que algo duele o deja de funcionar bien. A la mayoría de las mujeres se les dice simplemente 'haz tus Kegels' sin ninguna valoración de si su suelo pélvico es hipertónico (demasiado tenso) o hipotónico (demasiado débil).\n\nEn nuestro estudio de Poblenou, vemos que casi la mitad de las embarazadas que entran necesitan en realidad aprender a soltar: relajar conscientemente el diafragma pélvico en coordinación con exhalaciones profundas. Apretar un músculo que ya está tenso lo tensa más, lo que puede alargar el parto y aumentar el riesgo de desgarro.\n\nCuándo pedir cita con una fisioterapeuta especializada en Barcelona: hacia la semana 20 de embarazo para una valoración inicial, y entre las 6 y 8 semanas posparto antes de retomar cualquier ejercicio de impacto, correr o levantar peso.",
    author: "Luz Movement Studio",
    author_role_en: "Partner · Movement & Physical Therapy",
    author_role_es: "Partner · Movimiento y Fisioterapia",
    byline_en: "Written by Luz Movement Studio · Partner Feature",
    byline_es: "Escrito por Luz Movement Studio · Colaboración",
    audience: "public",
    status: "scheduled",
    published_at: new Date("2026-09-20T09:00:00Z"),
    views: 0,
  },
  {
    slug: "autumn-in-barcelona",
    category: "city",
    title: "Autumn in the city with small children",
    title_es: "Otoño en la ciudad con niños pequeños",
    excerpt: "What is on, from the Mercè to the chestnut stands on every corner.",
    excerpt_es: "Qué planes hacer, desde las fiestas de la Mercè hasta los puestos de castañas en cada esquina.",
    body: "Barcelona in autumn is a completely different city from the summer rush. The heat breaks in late September, the parks in Ciutadella and Montjuïc turn golden, and the streets smell of roasted chestnuts and sweet potatoes from the castanyeres.\n\nOur favourite spots for early mornings with strollers: Parc del Laberint d'Horta on weekday mornings before the crowds, the botanical gardens on Montjuïc with paved, gentle slopes, and the shaded courtyards around Sant Felip Neri in the Gothic Quarter when you need a quiet coffee while the baby naps.",
    body_es: "Barcelona en otoño es una ciudad totalmente diferente tras el bullicio del verano. El calor afloja a finales de septiembre, los parques de la Ciutadella y Montjuïc se tiñen de dorado y las calles huelen a castañas asadas y boniatos de las castañeras.\n\nNuestros rincones favoritos para paseos mañaneros con carrito: el Parc del Laberint d'Horta entre semana antes de que se llene, el jardín botánico de Montjuïc con sus rampas suaves y pavimentadas, y los patios con sombra alrededor de Sant Felip Neri en el Gótico cuando necesitas un café tranquilo mientras el bebé duerme.",
    author: "Marc Oliveras",
    author_role_en: "Editorial Contributor",
    author_role_es: "Colaborador Editorial",
    byline_en: "Written by Marc Oliveras · City Guide",
    byline_es: "Escrito por Marc Oliveras · Guía de la Ciudad",
    audience: "public",
    status: "draft",
    published_at: null,
    views: 0,
  }
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not found.");
    process.exit(1);
  }

  const sql = postgres(dbUrl);

  try {
    console.log("Seeding bilingual journal posts...");

    for (const post of SEED_POSTS) {
      const id = crypto.randomUUID();
      await sql`
        INSERT INTO "journal_post" (
          id, slug, category, title, title_es, excerpt, excerpt_es,
          quote_en, quote_es, body, body_es, author, author_role_en,
          author_role_es, byline_en, byline_es, audience, status,
          published_at, views
        ) VALUES (
          ${id}, ${post.slug}, ${post.category}, ${post.title}, ${post.title_es},
          ${post.excerpt}, ${post.excerpt_es}, ${post.quote_en || null}, ${post.quote_es || null},
          ${post.body}, ${post.body_es}, ${post.author}, ${post.author_role_en || null},
          ${post.author_role_es || null}, ${post.byline_en || null}, ${post.byline_es || null},
          ${post.audience}, ${post.status}, ${post.published_at || null}, ${post.views}
        )
        ON CONFLICT (slug) DO UPDATE SET
          category = EXCLUDED.category,
          title = EXCLUDED.title,
          title_es = EXCLUDED.title_es,
          excerpt = EXCLUDED.excerpt,
          excerpt_es = EXCLUDED.excerpt_es,
          quote_en = EXCLUDED.quote_en,
          quote_es = EXCLUDED.quote_es,
          body = EXCLUDED.body,
          body_es = EXCLUDED.body_es,
          author = EXCLUDED.author,
          author_role_en = EXCLUDED.author_role_en,
          author_role_es = EXCLUDED.author_role_es,
          byline_en = EXCLUDED.byline_en,
          byline_es = EXCLUDED.byline_es,
          audience = EXCLUDED.audience,
          status = EXCLUDED.status,
          published_at = EXCLUDED.published_at,
          views = EXCLUDED.views,
          updated_at = NOW();
      `;
      console.log(`✓ Seeded post: ${post.slug}`);
    }

    console.log("All bilingual journal posts seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await sql.end();
  }
}

main();
