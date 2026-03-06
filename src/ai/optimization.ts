import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { shipments } from "../db/schema";

export async function optimizeLanes() {
  const lanes = await db.execute(sql`
    SELECT lane_id, clean_origin as origin, clean_destination as destination, 
           COUNT(*) as shipment_count, AVG(raw_price) as avg_price, SUM(raw_weight) as total_volume
    FROM shipments 
    WHERE status = 'processed' AND is_duplicate = false AND is_anomaly = false
    GROUP BY lane_id
    ORDER BY shipment_count DESC
    LIMIT 10
  `);

  const optimizedLanes = await Promise.all(lanes.rows.map(async (lane: any) => {
    const carriers = await db.execute(sql`
      SELECT carrier_name, AVG(raw_price) as avg_price, COUNT(*) as count
      FROM shipments
      WHERE lane_id = ${lane.lane_id} AND status = 'processed' AND is_duplicate = false AND is_anomaly = false
      GROUP BY carrier_name
      ORDER BY avg_price ASC
      LIMIT 1
    `);

    const bestCarrier = carriers.rows[0];

    return {
      ...lane,
      best_carrier: bestCarrier ? bestCarrier.carrier_name : 'Unknown',
      best_price: bestCarrier ? bestCarrier.avg_price : lane.avg_price,
      optimization_score: Math.min(100, Math.round(((Number(lane.shipment_count)) * 10) + (100000 / Number(lane.avg_price))))
    };
  }));

  return optimizedLanes;
}
