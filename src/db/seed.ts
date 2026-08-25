import { db } from "./index";
import { eventCategory, window, adminUser, partner, setting, person, member, memberCredential, creditEntry, event, application } from "./schema";
import { and } from "drizzle-orm";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  console.log("🌱 Seeding database for The Mothers...");

  // 1. Seed Categories
  const categories = [
    { name: "Walks & Park Socials", slug: "walks-park-socials", stageAffinity: "All Stages", sortOrder: 1 },
    { name: "Play Dates", slug: "play-dates", stageAffinity: "0–3 years", sortOrder: 2 },
    { name: "MoM's Dates", slug: "moms-dates", stageAffinity: "All Stages", sortOrder: 3 },
    { name: "Learn & Grow", slug: "learn-grow", stageAffinity: "Pregnancy & Postpartum", sortOrder: 4 },
    { name: "Signature Experiences", slug: "signature-experiences", stageAffinity: "All Stages", sortOrder: 5 },
  ];

  for (const cat of categories) {
    await db
      .insert(eventCategory)
      .values(cat)
      .onConflictDoNothing({ target: eventCategory.slug });
  }

  // 2. Seed Default Open Launch Window
  const now = new Date();
  const closes = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  await db
    .insert(window)
    .values({
      opensAt: now,
      closesAt: closes,
      placesOffered: 50,
      joiningFeeCents: 1900,
      monthlyPriceCents: 2900,
      launchRate: true,
      lockMonths: 12,
      status: "open",
    })
    .onConflictDoNothing();

  // 3. Seed Default Admin
  const adminPasswordHash = await bcrypt.hash("MothersAdmin2026!", 12);
  await db
    .insert(adminUser)
    .values({
      email: "hello@themothers.cc",
      role: "owner",
      passwordHash: adminPasswordHash,
    })
    .onConflictDoNothing({ target: adminUser.email });

  // 3b. Seed Test Member
  const testPerson = await db
    .insert(person)
    .values({
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria@themothers.cc",
      locale: "es",
      isMother: true,
      source: "website",
    })
    .onConflictDoNothing({ target: person.email })
    .returning();

  const personId = testPerson[0]?.id;
  if (personId) {
    const memberPasswordHash = await bcrypt.hash("Member2026!", 12);
    await db.insert(memberCredential).values({
      personId,
      passwordHash: memberPasswordHash,
    }).onConflictDoNothing();

    const insertedMember = await db.insert(member).values({
      personId,
      status: "active",
      stage: "Postpartum (0–12 months)",
      neighbourhood: "Eixample & Gràcia",
      monthlyPriceCents: 2900,
      joiningFeePaidCents: 5800,
    }).returning();

    if (insertedMember[0]) {
      await db.insert(creditEntry).values({
        memberId: insertedMember[0].id,
        amount: 20,
        type: "grant",
        sourceType: "subscription",
        reason: "Initial Founding Member Grant",
      });
    }
  }

  for (const fixture of [
    { firstName: "Elena", lastName: "Martí", email: "elena@themothers.cc", stage: "Toddlers (1–3 years)", neighbourhood: "Gràcia" },
    { firstName: "Sofia", lastName: "Costa", email: "sofia@themothers.cc", stage: "Pregnant", neighbourhood: "Eixample" },
  ]) {
    let fixturePerson = await db.query.person.findFirst({ where: eq(person.email, fixture.email) });
    if (!fixturePerson) {
      [fixturePerson] = await db.insert(person).values({
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        email: fixture.email,
        locale: "en",
        isMother: true,
        source: "staging-seed",
      }).returning();
    }
    const existingMember = await db.query.member.findFirst({ where: eq(member.personId, fixturePerson.id) });
    if (!existingMember) {
      const [fixtureMember] = await db.insert(member).values({
        personId: fixturePerson.id,
        status: "active",
        stage: fixture.stage,
        neighbourhood: fixture.neighbourhood,
        monthlyPriceCents: 3900,
        joiningFeePaidCents: 1900,
      }).returning();
      await db.insert(creditEntry).values({
        memberId: fixtureMember.id,
        amount: 20,
        type: "grant",
        sourceType: "subscription",
        reason: "Staging member monthly grant",
      });
    }
  }

  // 4. Seed Partners
  const samplePartners = [
    {
      name: "Dorm Bé",
      slug: "dorm-be",
      umbrella: "Expert Care & Support",
      specialty: "Infant Sleep Consultancy",
      description: "Gentle, evidence-based sleep support tailored to your family rhythm.",
      offerForMembers: "15% off complete consultations & priority WhatsApp access",
    },
    {
      name: "Momentum Careers",
      slug: "momentum-careers",
      umbrella: "Expert Care & Support",
      specialty: "Maternal Career Coaching",
      description: "Specialist coaching for navigating return-to-work, balance and career pivots after baby.",
      offerForMembers: "Complimentary 30-min strategy review + 10% off coaching packs",
    },
    {
      name: "Luz Movement Studio",
      slug: "luz-movement",
      umbrella: "Wellness & Movement",
      specialty: "Prenatal & Postnatal Pelvic Movement",
      description: "Physiotherapist-led small group classes focusing on pelvic health and strength.",
      offerForMembers: "First class complimentary + 10% on monthly packs",
    },
    {
      name: "Casa Crianza",
      slug: "casa-crianza",
      umbrella: "Childcare & Family",
      specialty: "Flexible Childcare",
      description: "Trusted childcare support for evenings, school holidays and the in-between moments.",
      offerForMembers: "Priority introductions for members",
    },
    {
      name: "La Mesa Mothers",
      slug: "la-mesa-mothers",
      umbrella: "Food & Hospitality",
      specialty: "Family-friendly Dining",
      description: "Welcoming restaurants and tables where mothers can arrive as they are.",
      offerForMembers: "A welcome drink with member bookings",
    },
  ];

  for (const p of samplePartners) {
    await db
      .insert(partner)
      .values(p)
      .onConflictDoNothing();
  }

  // 5. Seed Core Settings
  const defaultSettings = [
    { key: "referral_bonus_credits", value: 20 },
    { key: "monthly_grant_credits", value: 20 },
    { key: "rollover_cap_credits", value: 40 },
    { key: "guest_pass_price_cents", value: 3500 },
    { key: "guest_pass_discount_cents", value: 3500 },
    { key: "max_lifetime_guest_passes", value: 2 },
  ];

  for (const s of defaultSettings) {
    await db.insert(setting).values(s).onConflictDoUpdate({
      target: setting.key,
      set: { value: s.value, updatedAt: new Date() },
    });
  }

  // 5b. Seed Application Records (review queue)
  const currentWindow = await db.query.window.findFirst({
    where: eq(window.status, "open"),
  });

  if (currentWindow) {
    const applicantPersons = [
      { firstName: "Anna", lastName: "Rossi", email: "anna.applicant@example.com" },
      { firstName: "Jessica", lastName: "López", email: "jessica.applicant@example.com" },
    ];

    for (const ap of applicantPersons) {
      let applicantPerson = await db.query.person.findFirst({ where: eq(person.email, ap.email) });
      if (!applicantPerson) {
        [applicantPerson] = await db.insert(person).values({
          firstName: ap.firstName,
          lastName: ap.lastName,
          email: ap.email,
          locale: "en",
          isMother: true,
          source: "website",
        }).returning();
      }

      const existingApp = await db.query.application.findFirst({
        where: and(eq(application.personId, applicantPerson.id), eq(application.windowId, currentWindow.id)),
      });

      if (!existingApp) {
        await db.insert(application).values({
          personId: applicantPerson.id,
          windowId: currentWindow.id,
          answers: {},
          status: "submitted",
          submittedAt: new Date(),
        });
      }
    }
  }

  // 5c. Add expanded ledger history to first member
  if (testPerson[0]) {
    const existingFirstMember = await db.query.member.findFirst({
      where: eq(member.personId, testPerson[0].id),
    });
    if (existingFirstMember) {
      // Add older grant entry
      await db.insert(creditEntry).values({
        memberId: existingFirstMember.id,
        amount: 20,
        type: "grant",
        sourceType: "subscription",
        reason: "July 2026 Monthly Grant",
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      });

      // Add a godmother referral entry
      await db.insert(creditEntry).values({
        memberId: existingFirstMember.id,
        amount: 5,
        type: "grant",
        sourceType: "godmother",
        reason: "Godmother referral activation bonus",
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      });
    }
  }

  // 6. Seed Dynamic Events
  const allCategories = await db.select().from(eventCategory);
  const catMap = new Map(allCategories.map((c) => [c.slug, c.id]));

  const sampleEvents = [
    {
      title: "Morning Walk & Coffee in Ciutadella",
      slug: "morning-walk-ciutadella",
      categoryId: catMap.get("walks-park-socials"),
      description: "A gentle morning stroll through Parc de la Ciutadella followed by specialty coffee and easy conversation under the trees.",
      neighbourhood: "Ciutat Vella",
      venueName: "Parc de la Ciutadella",
      meetingPoint: "Cascada Monumental (exact bench coordinates shared with confirmed attendees)",
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3.5 * 60 * 60 * 1000),
      creditCost: 0,
      capacityMember: 12,
      capacityGuest: 0,
      minToConfirm: 3,
      isSignature: false,
      isFreeWalk: true,
      status: "confirmed" as const,
    },
    {
      title: "Sensory Play & Stroller Meetup",
      slug: "sensory-play-stroller",
      categoryId: catMap.get("play-dates"),
      description: "Montessori-inspired tactile textures and gentle rhythm exercises for babies 0–12 months.",
      neighbourhood: "Sarrià-Sant Gervasi",
      venueName: "Jardins de la Tamarita",
      meetingPoint: "Private shade gazebo near Passeig de Sant Gervasi entrance",
      startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4.5 * 60 * 60 * 1000),
      creditCost: 18,
      capacityMember: 8,
      capacityGuest: 2,
      minToConfirm: 3,
      isSignature: false,
      isFreeWalk: false,
      status: "confirmed" as const,
    },
    {
      title: "MoM's Evening Vermut & Tapas",
      slug: "moms-evening-vermut",
      categoryId: catMap.get("moms-dates"),
      description: "An evening purely for mothers to unwind, enjoy artisanal vermut and seasonal tapas in a cozy Gràcia courtyard.",
      neighbourhood: "Gràcia",
      venueName: "Bodega Privada",
      meetingPoint: "Plaça de la Virreina (exact bodega address sent upon confirmation)",
      startsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 10.5 * 60 * 60 * 1000),
      creditCost: 20,
      capacityMember: 12,
      capacityGuest: 2,
      minToConfirm: 4,
      isSignature: false,
      isFreeWalk: false,
      status: "confirmed" as const,
    },
    {
      title: "Pelvic Floor & Postpartum Movement Workshop",
      slug: "pelvic-floor-workshop",
      categoryId: catMap.get("learn-grow"),
      description: "Led by specialist physiotherapists from Luz Movement Studio. Focused on safe postnatal core reactivation.",
      neighbourhood: "Eixample",
      venueName: "Luz Movement Studio",
      meetingPoint: "Carrer d'Aragó private studio loft",
      startsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 7.5 * 60 * 60 * 1000),
      creditCost: 16,
      capacityMember: 10,
      capacityGuest: 2,
      minToConfirm: 4,
      isSignature: false,
      isFreeWalk: false,
      status: "published_pending" as const,
    },
    {
      title: "Signature Vineyard & Long Table Lunch",
      slug: "signature-vineyard-lunch",
      categoryId: catMap.get("signature-experiences"),
      description: "An exclusive weekend escape to Alella vineyards with panoramic Mediterranean views and private sommelier pairing.",
      neighbourhood: "Outside Barcelona (Alella)",
      venueName: "Alta Alella Estate",
      meetingPoint: "Private shuttle departure from Plaça de Francesc Macià",
      startsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      creditCost: 65,
      capacityMember: 16,
      capacityGuest: 4,
      minToConfirm: 6,
      isSignature: true,
      isFreeWalk: false,
      status: "confirmed" as const,
    },
    {
      title: "Morning Walk & Coffee — Barceloneta",
      slug: "morning-walk-barceloneta-past",
      categoryId: catMap.get("walks-park-socials"),
      description: "Our first walk as a community. Thank you to every mother who came out.",
      neighbourhood: "Barceloneta",
      venueName: "Barceloneta Beach",
      meetingPoint: "Font de Neptú, Barceloneta",
      startsAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      creditCost: 0,
      capacityMember: 15,
      capacityGuest: 0,
      minToConfirm: 0,
      isSignature: false,
      isFreeWalk: true,
      status: "completed" as const,
    },
  ];

  for (const ev of sampleEvents) {
    await db
      .insert(event)
      .values(ev)
      .onConflictDoNothing({ target: event.slug });
  }

  console.log("✅ Seed completed successfully!");
}

seedDatabase().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
