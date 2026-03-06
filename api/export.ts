import { sql } from "drizzle-orm";
import { db } from "../src/db/index";

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const shipmentsResult = await db.execute(sql`SELECT * FROM shipments WHERE status = 'processed'`);
        return res.status(200).json(shipmentsResult.rows);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
