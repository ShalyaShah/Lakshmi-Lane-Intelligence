export function detectAnomaly(shipment: any) {
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
  }
  
  return { isAnomaly, reason };
}
