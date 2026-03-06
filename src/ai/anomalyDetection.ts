export function detectAnomaly(shipment: any, laneStats?: { mean: number, stdDev: number }) {
  let isAnomaly = 0;
  let reason = '';
  
  if (shipment.raw_price <= 0) {
    isAnomaly = 1;
    reason = 'Price <= 0';
  } else if (shipment.raw_weight <= 0) {
    isAnomaly = 1;
    reason = 'Weight <= 0';
  } else if (shipment.raw_price > 1000000) {
    isAnomaly = 1;
    reason = 'Price unusually high';
  } else if (laneStats && laneStats.stdDev > 0) {
    const zScore = Math.abs(shipment.raw_price - laneStats.mean) / laneStats.stdDev;
    if (zScore > 2) {
      isAnomaly = 1;
      reason = `Price deviates > 2 SD (Z-score: ${zScore.toFixed(2)})`;
    }
  }
  
  return { isAnomaly, reason };
}
