import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

declare global {
  // eslint-disable-next-line no-var
  var _postgresClient: ReturnType<typeof postgres> | undefined;
}

export const client =
  globalThis._postgresClient ||
  postgres(connectionString, {
    prepare: false,
    max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : (process.env.NODE_ENV === "production" ? 5 : 10),
    idle_timeout: 20,
    connect_timeout: 10,
    // Enable TCP keepalive to prevent stale/dropped connections
    keep_alive: 10,
  });

// Always cache client on globalThis to prevent connection pool leaks across module evaluations
globalThis._postgresClient = client;

export const db = drizzle(client, { schema });

