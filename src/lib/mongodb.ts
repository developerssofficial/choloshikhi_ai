/**
 * MongoDB client — singleton pattern (one connection, reuse everywhere).
 * Used for: DM messages, Group messages.
 * Everything else stays on Supabase (auth, profiles, subscriptions, groups).
 */
import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = "choloshikhi";

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

/**
 * Get the MongoDB database instance (singleton).
 * Reuses the same connection across all API routes.
 */
export function getDb(): Promise<Db> {
  if (dbPromise) return dbPromise;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });

  dbPromise = client.connect().then((c) => c.db(DB_NAME));
  return dbPromise;
}
