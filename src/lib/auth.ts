import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { person, memberCredential, member, adminUser } from "@/db/schema";
import { eq } from "drizzle-orm";

import { checkSignInRateLimit } from "@/lib/rate-limit";
import { captureException } from "@/lib/error-monitoring";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      id: "member-credentials",
      name: "Member Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // Rate limit check
        const rateCheck = checkSignInRateLimit(email);
        if (!rateCheck.success) {
          throw new Error("RATE_LIMIT_EXCEEDED");
        }

        // Find person
        const personRecord = await db.query.person.findFirst({
          where: eq(person.email, email),
        });

        if (!personRecord) return null;

        // Find member & credential
        const [credRecord, memberRecord] = await Promise.all([
          db.query.memberCredential.findFirst({
            where: eq(memberCredential.personId, personRecord.id),
          }),
          db.query.member.findFirst({
            where: eq(member.personId, personRecord.id),
          }),
        ]);

        if (!credRecord) return null;

        const isValid = await bcrypt.compare(password, credRecord.passwordHash);
        if (!isValid) return null;

        return {
          id: personRecord.id,
          email: personRecord.email,
          name: `${personRecord.firstName} ${personRecord.lastName}`,
          personId: personRecord.id,
          memberId: memberRecord?.id,
          status: memberRecord?.status || "applicant",
          stage: memberRecord?.stage,
          neighbourhood: memberRecord?.neighbourhood,
          profileDone: personRecord.profileDone ?? false,
          role: "member",
        };
      },
    }),
    Credentials({
      id: "admin-credentials",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // Rate limit check
        const rateCheck = checkSignInRateLimit(`admin:${email}`);
        if (!rateCheck.success) {
          throw new Error("RATE_LIMIT_EXCEEDED");
        }

        const admin = await db.query.adminUser.findFirst({
          where: eq(adminUser.email, email),
        });

        if (!admin || admin.disabledAt) return null;

        const isValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isValid) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: `Admin (${admin.role})`,
          role: admin.role, // 'owner', 'manager', 'host'
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.personId = (user as any).personId;
        token.memberId = (user as any).memberId;
        token.status = (user as any).status;
        token.stage = (user as any).stage;
        token.neighbourhood = (user as any).neighbourhood;
        token.profileDone = (user as any).profileDone ?? false;
        token.loginTime = Math.floor(Date.now() / 1000);
      }
      if (trigger === "update" && session) {
        if (session.profileDone !== undefined) {
          token.profileDone = session.profileDone;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).personId = token.personId;
        (session.user as any).memberId = token.memberId;
        (session.user as any).status = token.status;
        (session.user as any).stage = token.stage;
        (session.user as any).neighbourhood = token.neighbourhood;
        (session.user as any).profileDone = token.profileDone ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/account/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours
  },
});

/**
 * Shared Admin Authentication & Role Authorization Helper
 * 
 * Enforces admin authorization across all server actions.
 * Refuses regular member accounts and unauthenticated requests with UNAUTHORIZED_ADMIN.
 */
export async function verifyAdminSession(
  allowedRoles: string[] = ["owner", "manager", "host", "super_admin"]
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const adminId = session?.user?.id;

  if (!session?.user || !role || !allowedRoles.includes(role)) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }

  return {
    adminId: adminId || "admin",
    role,
    user: session.user,
  };
}
