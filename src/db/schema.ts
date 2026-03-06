import { pgTable, serial, text, real, integer } from "drizzle-orm/pg-core";

export const shipments = pgTable("shipments", {
    id: serial("id").primaryKey(),
    rawOrigin: text("raw_origin"),
    rawDestination: text("raw_destination"),
    rawTruckType: text("raw_truck_type"),
    rawWeight: real("raw_weight"),
    rawPrice: real("raw_price"),
    rawTimestamp: text("raw_timestamp"),
    carrierName: text("carrier_name"),
    cleanOrigin: text("clean_origin"),
    cleanDestination: text("clean_destination"),
    cleanTruckType: text("clean_truck_type"),
    isDuplicate: text("is_duplicate").default("false"),
    isAnomaly: text("is_anomaly").default("false"),
    anomalyReason: text("anomaly_reason"),
    laneId: text("lane_id"),
    status: text("status").default("raw"),
});

export const metrics = pgTable("metrics", {
    id: serial("id").primaryKey(),
    totalProcessed: integer("total_processed").default(0),
    duplicatesRemoved: integer("duplicates_removed").default(0),
    anomaliesDetected: integer("anomalies_detected").default(0),
    normalizationAccuracy: real("normalization_accuracy").default(0),
    processingTimeMs: integer("processing_time_ms").default(0),
});

export const standardCities = pgTable("standard_cities", {
    id: serial("id").primaryKey(),
    cityName: text("city_name").unique(),
});
