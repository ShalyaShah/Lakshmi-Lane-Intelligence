import { sql } from "drizzle-orm";
import { db } from "../src/db/index";
import busboy from 'busboy';
import { parse } from 'csv-parse';

// Disable default body parser to handle multipart/form-data
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const bb = busboy({ headers: req.headers });
    const results: any[] = [];
    let numRecords = 0;

    bb.on('file', (name, file, info) => {
        // Parse CSV stream directly from the uploaded file buffer
        const parser = parse({
            columns: true,
            skip_empty_lines: true
        });

        parser.on('readable', function () {
            let record;
            while ((record = parser.read()) !== null) {
                results.push(record);
                numRecords++;
            }
        });

        file.pipe(parser);
    });

    bb.on('close', async () => {
        try {
            if (results.length === 0) {
                return res.status(400).json({ error: 'No data found in uploaded file' });
            }

            // Batch insert into Vercel Postgres using Drizzle
            for (const s of results) {
                await db.execute(sql`
          INSERT INTO shipments (
            raw_origin, raw_destination, raw_truck_type, raw_weight, raw_price, raw_timestamp, carrier_name
          ) VALUES (
            ${s.origin_city || s.origin || ''}, 
            ${s.destination_city || s.destination || ''}, 
            ${s.truck_type || ''}, 
            ${parseFloat(s.shipment_weight || s.weight || 0)}, 
            ${parseFloat(s.price || 0)}, 
            ${s.timestamp || new Date().toISOString()}, 
            ${s.carrier_name || ''}
          )
        `);
            }

            return res.status(200).json({ message: 'File uploaded successfully', count: results.length });
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    });

    req.pipe(bb);
}
