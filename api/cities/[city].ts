import { sql } from "drizzle-orm";
import { db } from "../../src/db/index";

export default async function handler(req: any, res: any) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { city } = req.query;
        if (!city) return res.status(400).json({ error: 'City parameter required' });

        await db.execute(sql`DELETE FROM standard_cities WHERE city_name = ${city.toUpperCase()}`);
        return res.status(200).json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
