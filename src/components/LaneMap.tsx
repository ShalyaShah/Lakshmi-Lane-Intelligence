import React, { useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
  ZoomableGroup
} from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Coordinates for major Indian cities
const cityCoordinates: Record<string, [number, number]> = {
  'MUMBAI': [72.8777, 19.0760],
  'BANGALORE': [77.5946, 12.9716],
  'DELHI': [77.2090, 28.6139],
  'CHENNAI': [80.2707, 13.0827],
  'HYDERABAD': [78.4867, 17.3850],
  'KOLKATA': [88.3639, 22.5726],
  'PUNE': [73.8567, 18.5204],
  'AHMEDABAD': [72.5714, 23.0225],
  'JAIPUR': [75.7873, 26.9124],
  'SURAT': [72.8311, 21.1702],
  'LUCKNOW': [80.9462, 26.8467],
  'KANPUR': [80.3319, 26.4499],
  'NAGPUR': [79.0882, 21.1458],
  'INDORE': [75.8577, 22.7196],
  'THANE': [72.9781, 19.1973],
  'BHOPAL': [77.4126, 23.2599],
  'VISAKHAPATNAM': [83.2185, 17.6868],
  'PATNA': [85.1376, 25.5941],
  'VADODARA': [73.1812, 22.3072],
  'GHAZIABAD': [77.4538, 28.6692],
  'LUDHIANA': [75.8573, 30.9010],
  'AGRA': [78.0081, 27.1767],
  'NASHIK': [73.7898, 19.9975],
  'FARIDABAD': [77.3178, 28.4089],
  'MEERUT': [77.7064, 28.9845],
  'RAJKOT': [70.7923, 22.3039],
  'VARANASI': [82.9986, 25.3176],
  'SRINAGAR': [74.7973, 34.0837],
  'AURANGABAD': [75.3249, 19.8762],
  'DHANBAD': [86.4304, 23.7957],
  'AMRITSAR': [74.8723, 31.6340],
  'ALLAHABAD': [81.8463, 25.4358],
  'RANCHI': [85.3096, 23.3441],
  'HOWRAH': [88.3297, 22.5958],
  'COIMBATORE': [76.9558, 11.0168],
  'JABALPUR': [79.9339, 23.1815],
  'GWALIOR': [78.1828, 26.2183],
  'VIJAYAWADA': [80.6480, 16.5062],
  'JODHPUR': [73.0243, 26.2389],
  'MADURAI': [78.1198, 9.9252],
  'RAIPUR': [81.6296, 21.2514],
  'KOTA': [75.8243, 25.2138],
  'GUWAHATI': [91.7362, 26.1445],
  'CHANDIGARH': [76.7794, 30.7333],
  'MYSORE': [76.6394, 12.2958],
  'TIRUCHIRAPPALLI': [78.6569, 10.7905],
  'BHUBANESWAR': [85.8245, 20.2961],
  'SALEM': [78.1460, 11.6643],
  'THIRUVANANTHAPURAM': [76.9366, 8.5241],
  'NOIDA': [77.3260, 28.5355],
  'KOCHI': [76.2673, 9.9312],
  'DEHRADUN': [78.0322, 30.3165],
  'UDAIPUR': [73.6828, 24.5854],
};

interface LaneMapProps {
  lanes: any[];
}

export default function LaneMap({ lanes }: LaneMapProps) {
  const mapData = useMemo(() => {
    const lines: any[] = [];
    const markers = new Map<string, [number, number]>();

    // Find max volume for scaling line thickness
    const maxVolume = Math.max(...lanes.map(l => l.shipment_count), 1);

    lanes.forEach(lane => {
      const [origin, dest] = lane.lane_id.split('-');
      const originCoords = cityCoordinates[origin];
      const destCoords = cityCoordinates[dest];

      if (originCoords && destCoords) {
        markers.set(origin, originCoords);
        markers.set(dest, destCoords);

        lines.push({
          from: originCoords,
          to: destCoords,
          volume: lane.shipment_count,
          strokeWidth: Math.max(1, (lane.shipment_count / maxVolume) * 5),
          laneId: lane.lane_id
        });
      }
    });

    return { lines, markers: Array.from(markers.entries()) };
  }, [lanes]);

  return (
    <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1000,
          center: [80, 22] // Center of India
        }}
        width={800}
        height={600}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup center={[80, 22]} zoom={1} minZoom={1} maxZoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#cbd5e1", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {mapData.lines.map((line, i) => (
            <Line
              key={i}
              from={line.from}
              to={line.to}
              stroke="#4f46e5"
              strokeWidth={line.strokeWidth}
              strokeLinecap="round"
              style={{ outline: "none", opacity: 0.6 }}
            />
          ))}

          {mapData.markers.map(([name, coords]) => (
            <Marker key={name} coordinates={coords}>
              <circle r={3} fill="#ef4444" stroke="#fff" strokeWidth={1} />
              <text
                textAnchor="middle"
                y={-8}
                style={{ fontFamily: "system-ui", fill: "#475569", fontSize: "8px", fontWeight: 600 }}
              >
                {name}
              </text>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
