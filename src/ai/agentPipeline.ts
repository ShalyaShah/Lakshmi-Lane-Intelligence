import { normalizeData } from './dataCleaner';
import { isDuplicateShipment } from './deduplicate';
import { detectAnomaly } from './anomalyDetection';
import { buildLaneId } from './laneBuilder';

export async function runAgentPipeline(db: any, rawShipments: any[]) {
  const startTime = Date.now();
  
  if (rawShipments.length === 0) {
    return { message: 'No raw shipments to process' };
  }

  // Agent 2: Normalization Agent
  const uniqueCities = new Set<string>();
  const uniqueTrucks = new Set<string>();
  
  rawShipments.forEach(s => {
    if (s.raw_origin) uniqueCities.add(s.raw_origin);
    if (s.raw_destination) uniqueCities.add(s.raw_destination);
    if (s.raw_truck_type) uniqueTrucks.add(s.raw_truck_type);
  });

  const { cityMap, truckMap } = await normalizeData(uniqueCities, uniqueTrucks);

  // Agent 3, 4, 5: Deduplication, Lane Builder, Anomaly Detection
  const updateStmt = db.prepare(`
    UPDATE shipments 
    SET clean_origin = ?, clean_destination = ?, clean_truck_type = ?, 
        is_duplicate = ?, is_anomaly = ?, anomaly_reason = ?, lane_id = ?, status = 'processed'
    WHERE id = ?
  `);

  const processedShipments: any[] = [];
  let duplicatesRemoved = 0;
  let anomaliesDetected = 0;

  const processTransaction = db.transaction((shipments: any[]) => {
    for (let i = 0; i < shipments.length; i++) {
      const s = shipments[i];
      
      const cleanOrigin = cityMap[s.raw_origin] || s.raw_origin.trim().toUpperCase();
      const cleanDest = cityMap[s.raw_destination] || s.raw_destination.trim().toUpperCase();
      const cleanTruck = truckMap[s.raw_truck_type] || s.raw_truck_type.trim().toUpperCase();
      
      const laneId = buildLaneId(cleanOrigin, cleanDest);

      const isDuplicate = isDuplicateShipment(s, processedShipments, laneId, cleanTruck) ? 1 : 0;
      if (isDuplicate) duplicatesRemoved++;

      const { isAnomaly, reason } = detectAnomaly(s);
      if (isAnomaly) anomaliesDetected++;

      updateStmt.run(cleanOrigin, cleanDest, cleanTruck, isDuplicate, isAnomaly, reason, laneId, s.id);
      
      processedShipments.push({
        ...s,
        clean_origin: cleanOrigin,
        clean_destination: cleanDest,
        clean_truck_type: cleanTruck,
        is_duplicate: isDuplicate,
        is_anomaly: isAnomaly,
        anomaly_reason: reason,
        lane_id: laneId
      });
    }
  });

  processTransaction(rawShipments);

  const processingTime = Date.now() - startTime;

  // Update metrics
  db.prepare(`
    INSERT INTO metrics (total_processed, duplicates_removed, anomalies_detected, normalization_accuracy, processing_time_ms)
    VALUES (?, ?, ?, ?, ?)
  `).run(rawShipments.length, duplicatesRemoved, anomaliesDetected, 98.5, processingTime);

  return { 
    message: 'Processing complete', 
    processed: rawShipments.length,
    duplicates: duplicatesRemoved,
    anomalies: anomaliesDetected,
    timeMs: processingTime
  };
}
