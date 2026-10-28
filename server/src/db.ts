import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { config } from './config.js';
import { logger } from './logger.js';

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (database) return database;

  const newClient = new MongoClient(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await newClient.connect();

  // Database ka naam URI se aata hai (humne /dispatch rakha hai).
  const db = newClient.db();
  await db.command({ ping: 1 });

  client = newClient;
  database = db;
  logger.info({ db: db.databaseName }, 'mongodb connected');
  return db;
}

export function getDb(): Db {
  if (!database) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return database;
}

export async function pingDb(): Promise<boolean> {
  if (!database) return false;
  try {
    await database.command({ ping: 1 });
    return true;
  } catch (err) {
    logger.warn({ err }, 'mongodb ping failed');
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    database = null;
    logger.info('mongodb connection closed');
  }
}
