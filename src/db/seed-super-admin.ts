import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "@/db";
import { adminUser } from "@/db/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || "super@themothers.cc";
  const password = process.env.SUPER_ADMIN_PASSWORD || "mothers-super-secure-123";

  console.log(`Checking for super admin account: ${email}`);

  const existing = await db.query.adminUser.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (existing) {
    console.log("Super admin already exists. Exiting.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(adminUser).values({
    id: crypto.randomUUID(),
    email,
    role: "super_admin",
    passwordHash,
  });

  console.log("✅ Super admin created successfully.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("You can log in at the hidden route: /super-admin/login");
  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
