import { sql } from "drizzle-orm";
import { db } from "../src/db/index";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Note: Drizzle with Vercel Postgres usually requires migrations rather than 
    // raw DROP and CREATE, but we can execute raw SQL for this demo purpose
    await db.execute(sql`DROP TABLE IF EXISTS shipments;`);
    await db.execute(sql`DROP TABLE IF EXISTS metrics;`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        raw_origin TEXT,
        raw_destination TEXT,
        raw_truck_type TEXT,
        raw_weight REAL,
        raw_price REAL,
        raw_timestamp TEXT,
        carrier_name TEXT,
        clean_origin TEXT,
        clean_destination TEXT,
        clean_truck_type TEXT,
        is_duplicate BOOLEAN DEFAULT FALSE,
        is_anomaly BOOLEAN DEFAULT FALSE,
        anomaly_reason TEXT,
        lane_id TEXT,
        status TEXT DEFAULT 'raw'
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        total_processed INTEGER DEFAULT 0,
        duplicates_removed INTEGER DEFAULT 0,
        anomalies_detected INTEGER DEFAULT 0,
        normalization_accuracy REAL DEFAULT 0,
        processing_time_ms INTEGER DEFAULT 0
      );
    `);

    return res.status(200).json({ message: 'Database reset successfully' });
  } catch (error: any) {
    console.error("Reset Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
