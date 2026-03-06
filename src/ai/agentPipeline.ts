import { normalizeData } from './dataCleaner';
import { isDuplicateShipment } from './deduplicate';
import { detectAnomaly } from './anomalyDetection';
import { buildLaneId } from './laneBuilder';
import { IsolationForest } from 'isolation-forest';
import { sql } from "drizzle-orm";

export async function runAgentPipeline(db: any, rawShipments: any[]) {
  const startTime = Date.now();

  if (rawShipments.length === 0) {
    return { message: 'No raw shipments to process' };
  }

  // Fetch historical prices per lane for anomaly detection
  const historicalPricesResult = await db.execute(sql`
    SELECT lane_id, raw_price, raw_weight, clean_truck_type FROM shipments WHERE status = 'processed' AND is_anomaly = false
  `);
  const historicalPrices = historicalPricesResult.rows;

  const lanePrices: Record<string, number[]> = {};
  historicalPrices.forEach((h: any) => {
    if (!lanePrices[h.lane_id]) lanePrices[h.lane_id] = [];
    lanePrices[h.lane_id].push(Number(h.raw_price));
  });

  // Agent 2: Normalization Agent
  const uniqueCities = new Set<string>();
  const uniqueTrucks = new Set<string>();

  rawShipments.forEach(s => {
    if (s.raw_origin) uniqueCities.add(s.raw_origin);
    if (s.raw_destination) uniqueCities.add(s.raw_destination);
    if (s.raw_truck_type) uniqueTrucks.add(s.raw_truck_type);
  });

  const { cityMap, truckMap } = await normalizeData(db, uniqueCities, uniqueTrucks);

  // Prepare data for Isolation Forest
  const forestData: any[] = [];
  const laneMap = new Map<string, number>();
  const truckTypeMap = new Map<string, number>();
  let laneCounter = 0;
  let truckCounter = 0;

  historicalPrices.forEach((h: any) => {
    if (!laneMap.has(h.lane_id)) laneMap.set(h.lane_id, laneCounter++);
    if (!truckTypeMap.has(h.clean_truck_type)) truckTypeMap.set(h.clean_truck_type, truckCounter++);

    forestData.push({
      price: Number(h.raw_price),
      weight: Number(h.raw_weight),
      lane: laneMap.get(h.lane_id),
      truck: truckTypeMap.get(h.clean_truck_type)
    });
  });

  const currentBatchFeatures: any[] = [];
  rawShipments.forEach(s => {
    const cleanOrigin = cityMap[s.raw_origin] || s.raw_origin.trim().toUpperCase();
    const cleanDest = cityMap[s.raw_destination] || s.raw_destination.trim().toUpperCase();
    const cleanTruck = truckMap[s.raw_truck_type] || s.raw_truck_type.trim().toUpperCase();
    const laneId = buildLaneId(cleanOrigin, cleanDest);

    if (!laneMap.has(laneId)) laneMap.set(laneId, laneCounter++);
    if (!truckTypeMap.has(cleanTruck)) truckTypeMap.set(cleanTruck, truckCounter++);

    const feature = {
      price: Number(s.raw_price),
      weight: Number(s.raw_weight),
      lane: laneMap.get(laneId),
      truck: truckTypeMap.get(cleanTruck)
    };
    forestData.push(feature);
    currentBatchFeatures.push(feature);
  });

  let forest: any = null;
  if (forestData.length > 5) {
    forest = new IsolationForest();
    forest.fit(forestData);
  }

  // Agent 3, 4, 5: Deduplication, Lane Builder, Anomaly Detection
  const processedShipments: any[] = [];
  let duplicatesRemoved = 0;
  let anomaliesDetected = 0;

  let aiCorrectedStrings = 0;
  let totalStrings = 0;

  // We perform sequential updates since Serverless DBs usually don't support simple transactions
  // through raw SQL the same way as better-sqlite3 local. We'll await each update.
  for (let i = 0; i < rawShipments.length; i++) {
    const s = rawShipments[i];

    const cleanOrigin = cityMap[s.raw_origin] || s.raw_origin.trim().toUpperCase();
    const cleanDest = cityMap[s.raw_destination] || s.raw_destination.trim().toUpperCase();
    const cleanTruck = truckMap[s.raw_truck_type] || s.raw_truck_type.trim().toUpperCase();

    if (cleanOrigin !== s.raw_origin) aiCorrectedStrings++;
    if (cleanDest !== s.raw_destination) aiCorrectedStrings++;
    if (cleanTruck !== s.raw_truck_type) aiCorrectedStrings++;
    totalStrings += 3;

    const laneId = buildLaneId(cleanOrigin, cleanDest);

    const isDuplicate = isDuplicateShipment(s, processedShipments, laneId, cleanTruck);
    if (isDuplicate) duplicatesRemoved++;

    // Calculate lane stats
    let laneStats = undefined;
    const prices = lanePrices[laneId] || [];
    if (prices.length >= 3) {
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      laneStats = { mean, stdDev };
    }

    let ifScore = 0;
    if (forest) {
      ifScore = forest.predict([currentBatchFeatures[i]])[0];
    }

    const { isAnomaly, reason } = detectAnomaly(s, laneStats, cleanOrigin, cleanDest, ifScore);
    if (isAnomaly) {
      anomaliesDetected++;
    } else if (!isDuplicate) {
      // Add to lane prices for future shipments in this batch
      if (!lanePrices[laneId]) lanePrices[laneId] = [];
      lanePrices[laneId].push(Number(s.raw_price));
    }

    await db.execute(sql`
      UPDATE shipments 
      SET clean_origin = ${cleanOrigin}, clean_destination = ${cleanDest}, clean_truck_type = ${cleanTruck}, 
          is_duplicate = ${isDuplicate}, is_anomaly = ${Boolean(isAnomaly)}, anomaly_reason = ${reason}, lane_id = ${laneId}, status = 'processed'
      WHERE id = ${s.id}
    `);

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


  const processingTime = Date.now() - startTime;
  const normalizationAccuracy = totalStrings > 0 ? Math.round((aiCorrectedStrings / totalStrings) * 1000) / 10 : 0;

  // Update metrics
  await db.execute(sql`
    INSERT INTO metrics (total_processed, duplicates_removed, anomalies_detected, normalization_accuracy, processing_time_ms)
    VALUES (${rawShipments.length}, ${duplicatesRemoved}, ${anomaliesDetected}, ${normalizationAccuracy}, ${processingTime})
  `);

  return {
    message: 'Processing complete',
    processed: rawShipments.length,
    duplicates: duplicatesRemoved,
    anomalies: anomaliesDetected,
    timeMs: processingTime
  };
}
