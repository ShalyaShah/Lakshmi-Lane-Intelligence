import { sql } from "drizzle-orm";
import { db } from "../src/db/index";
import { optimizeLanes } from "../src/ai/optimization";

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const metricsResult = await db.execute(sql`SELECT * FROM metrics ORDER BY id DESC LIMIT 1`);
        const metrics = metricsResult.rows[0] || {
            total_processed: 0, duplicates_removed: 0, anomalies_detected: 0, normalization_accuracy: 0, processing_time_ms: 0
        };

        const lanes = await optimizeLanes();

        const anomaliesResult = await db.execute(sql`
      SELECT * FROM shipments WHERE is_anomaly = true ORDER BY id DESC LIMIT 10
    `);
        const anomalies = anomaliesResult.rows;

        const recentShipmentsResult = await db.execute(sql`
      SELECT * FROM shipments WHERE status = 'processed' ORDER BY id DESC LIMIT 20
    `);
        const recentShipments = recentShipmentsResult.rows;

        return res.status(200).json({ metrics, lanes, anomalies, recentShipments });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
