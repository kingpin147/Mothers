import * as dotenv from "dotenv";
dotenv.config();

import { db } from "../src/db";
import { person, memberCredential, member } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const email = "maria@themothers.cc";
  const newPassword = "Password123!";

  console.log(`Setting password for ${email} to: ${newPassword}`);

  const p = await db.query.person.findFirst({
    where: eq(person.email, email),
  });

  if (!p) {
    console.error(`Person record for ${email} not found!`);
    process.exit(1);
  }

  console.log(`Found Person: ${p.id} (${p.firstName} ${p.lastName})`);

  const m = await db.query.member.findFirst({
    where: eq(member.personId, p.id),
  });
  console.log(`Member record: ${m?.id}, status: ${m?.status}, tier: ${m?.tierId}, credits: ${m?.creditBalance}`);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const cred = await db.query.memberCredential.findFirst({
    where: eq(memberCredential.personId, p.id),
  });

  if (cred) {
    await db.update(memberCredential)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(memberCredential.id, cred.id));
    console.log(`Updated existing credential (${cred.id}) with new password hash!`);
  } else {
    await db.insert(memberCredential).values({
      personId: p.id,
      passwordHash,
    });
    console.log(`Inserted new credential for Person ${p.id}!`);
  }

  console.log("Password reset successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
