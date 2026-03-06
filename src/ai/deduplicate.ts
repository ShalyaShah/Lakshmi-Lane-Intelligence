import * as fuzzball from 'fuzzball';

export function isDuplicateShipment(currentShipment: any, processedShipments: any[], laneId: string, cleanTruck: string) {
  for (const p of processedShipments) {
    if (p.lane_id === laneId && p.clean_truck_type === cleanTruck && Math.abs(p.raw_price - currentShipment.raw_price) < 10) {
      const carrierSim = fuzzball.ratio(currentShipment.carrier_name || '', p.carrier_name || '');
      if (carrierSim > 80) {
        return true;
      }
    }
  }
  return false;
}
