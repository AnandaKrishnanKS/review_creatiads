import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const FALLBACK_DB_PATH = path.join(process.cwd(), '../shared_reviews.json');

let pool = null;
let dbMode = 'local';

if (process.env.DATABASE_URL) {
  try {
    if (!global.pgPool) {
      global.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
    }
    pool = global.pgPool;
    dbMode = 'postgres';
  } catch (err) {
    console.error('Failed to create PostgreSQL pool, falling back to local storage:', err.message);
    dbMode = 'local';
  }
} else {
  dbMode = 'local';
}

let isDbInitialized = false;

async function initDb() {
  if (dbMode === 'postgres') {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          location VARCHAR(100) NOT NULL,
          rating INT NOT NULL,
          review_text TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'Unseen',
          client_notes TEXT DEFAULT '',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      client.release();
      isDbInitialized = true;
      console.log('PostgreSQL DB initialized successfully.');
    } catch (err) {
      console.error('PostgreSQL query execution failed. Switching to local JSON storage mode:', err.message);
      dbMode = 'local';
      initLocalDb();
    }
  } else {
    initLocalDb();
  }
}

function initLocalDb() {
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify([], null, 2));
    console.log('Initialized local JSON database file at:', FALLBACK_DB_PATH);
  } else {
    console.log('Using existing local JSON database file at:', FALLBACK_DB_PATH);
  }
  isDbInitialized = true;
}

export async function getDb() {
  if (!isDbInitialized) {
    await initDb();
  }
  return { pool, dbMode, FALLBACK_DB_PATH };
}
