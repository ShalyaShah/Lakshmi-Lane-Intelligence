import { sql } from "drizzle-orm";
import { db } from "../src/db/index";

export default async function handler(req: any, res: any) {
    try {
        if (req.method === 'GET') {
            const cities = await db.execute(sql`SELECT city_name FROM standard_cities ORDER BY city_name ASC`);
            return res.status(200).json(cities.rows.map((c: any) => c.city_name));
        }

        if (req.method === 'POST') {
            const { city } = req.body;
            if (!city) return res.status(400).json({ error: 'City name required' });

            try {
                await db.execute(sql`INSERT INTO standard_cities (city_name) VALUES (${city.trim().toUpperCase()})`);
                return res.status(200).json({ success: true });
            } catch (err) {
                return res.status(400).json({ error: 'City might already exist or invalid input' });
            }
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
