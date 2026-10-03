import "dotenv/config";
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import fs from "fs";
import path from "path";

/**
 * Automated Database Backup & Snapshot Utility
 * 
 * Extracts full database state into a timestamped JSON/SQL snapshot artifact.
 * In production: Managed PostgreSQL (Neon / Supabase / AWS RDS / Vercel Postgres)
 * performs continuous WAL archiving and automated daily backups with 7-30 days retention.
 */
async function performDatabaseBackup() {
  console.log("=== THE MOTHERS — DATABASE BACKUP & INTEGRITY VERIFICATION ===");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `db-backup-${timestamp}.json`);
  console.log(`Creating snapshot: ${backupFile}`);

  try {
    const [
      persons,
      members,
      credentials,
      events,
      bookings,
      payments,
      ledgers,
      posts,
      replies,
      settings,
    ] = await Promise.all([
      db.select().from(schema.person),
      db.select().from(schema.member),
      db.select().from(schema.memberCredential),
      db.select().from(schema.event),
      db.select().from(schema.booking),
      db.select().from(schema.payment),
      db.select().from(schema.ledgerEntry),
      db.select().from(schema.gazettePost),
      db.select().from(schema.gazetteReply),
      db.select().from(schema.setting),
    ]);

    const backupData = {
      meta: {
        timestamp: new Date().toISOString(),
        tables: {
          person: persons.length,
          member: members.length,
          memberCredential: credentials.length,
          event: events.length,
          booking: bookings.length,
          payment: payments.length,
          ledgerEntry: ledgers.length,
          gazettePost: posts.length,
          gazetteReply: replies.length,
          setting: settings.length,
        },
      },
      data: {
        persons,
        members,
        // Exclude cleartext credentials if any, hashes preserved
        credentials: credentials.map((c) => ({
          id: c.id,
          personId: c.personId,
          passwordHash: c.passwordHash,
          createdAt: c.createdAt,
        })),
        events,
        bookings,
        payments,
        ledgers,
        posts,
        replies,
        settings,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), "utf8");
    console.log("✓ Backup snapshot successfully created.");
    console.log("Table summary:", backupData.meta.tables);
  } catch (err) {
    console.error("Backup failed:", err);
    process.exit(1);
  }
}

performDatabaseBackup();
