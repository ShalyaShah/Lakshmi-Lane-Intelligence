export function optimizeLanes(db: any) {
  const lanes = db.prepare(`
    SELECT lane_id, clean_origin as origin, clean_destination as destination, 
           COUNT(*) as shipment_count, AVG(raw_price) as avg_price, SUM(raw_weight) as total_volume
    FROM shipments 
    WHERE status = 'processed' AND is_duplicate = 0 AND is_anomaly = 0
    GROUP BY lane_id
    ORDER BY shipment_count DESC
    LIMIT 10
  `).all();

  const optimizedLanes = lanes.map((lane: any) => {
    const carriers = db.prepare(`
      SELECT carrier_name, AVG(raw_price) as avg_price, COUNT(*) as count
      FROM shipments
      WHERE lane_id = ? AND status = 'processed' AND is_duplicate = 0 AND is_anomaly = 0
      GROUP BY carrier_name
      ORDER BY avg_price ASC
      LIMIT 1
    `).get(lane.lane_id);

    return {
      ...lane,
      best_carrier: carriers ? carriers.carrier_name : 'Unknown',
      best_price: carriers ? carriers.avg_price : lane.avg_price,
      optimization_score: Math.min(100, Math.round((lane.shipment_count * 10) + (100000 / lane.avg_price)))
    };
  });

  return optimizedLanes;
}
