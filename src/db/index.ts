import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Vercel's Neon integration exposes DATABASE_URL_UNPOOLED in production.
// Prefer the pooled URL when configured, but support the provisioned unpooled
// URL so a fresh production environment doesn't silently disable persistence.
const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
export const db = connectionString ? drizzle(neon(connectionString), { schema }) : null;
