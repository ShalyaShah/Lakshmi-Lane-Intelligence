import { sql } from "drizzle-orm";
import { db } from "../src/db/index";
import { runAgentPipeline } from "../src/ai/agentPipeline";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Agent 1: Data Validator (Fetch raw shipments)
        const rawShipmentsResult = await db.execute(sql`SELECT * FROM shipments WHERE status = 'raw'`);
        const rawShipments = rawShipmentsResult.rows;

        if (rawShipments.length === 0) {
            return res.status(200).json({ message: 'No raw shipments to process' });
        }

        const result = await runAgentPipeline(db, rawShipments);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
