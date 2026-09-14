import * as dotenv from "dotenv";
dotenv.config();

import { db } from "../src/db";
import { person, memberCredential, member } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const email = "maria@themothers.cc";
  const testPassword = "Password123!";

  const personRecord = await db.query.person.findFirst({
    where: eq(person.email, email),
  });

  if (!personRecord) {
    console.log("FAIL: person not found");
    process.exit(1);
  }

  const [credRecord, memberRecord] = await Promise.all([
    db.query.memberCredential.findFirst({
      where: eq(memberCredential.personId, personRecord.id),
    }),
    db.query.member.findFirst({
      where: eq(member.personId, personRecord.id),
    }),
  ]);

  if (!credRecord) {
    console.log("FAIL: credentials not found");
    process.exit(1);
  }

  const isValid = await bcrypt.compare(testPassword, credRecord.passwordHash);
  console.log("Password match:", isValid);
  console.log("Auth session payload:", {
    id: personRecord.id,
    email: personRecord.email,
    name: `${personRecord.firstName} ${personRecord.lastName}`,
    memberId: memberRecord?.id,
    status: memberRecord?.status,
    role: "member",
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
