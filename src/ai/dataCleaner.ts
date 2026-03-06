import { GoogleGenAI } from '@google/genai';
import * as fuzzball from 'fuzzball';

export async function normalizeData(db: any, uniqueCities: Set<string>, uniqueTrucks: Set<string>) {
  const cityList = Array.from(uniqueCities).join(', ');
  const truckList = Array.from(uniqueTrucks).join(', ');

  const standardCities = db.prepare("SELECT city_name FROM standard_cities").all().map((c: any) => c.city_name);

  let cityMap: Record<string, string> = {};
  let truckMap: Record<string, string> = {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are an AI data cleaning agent for a logistics company.
        Normalize the following messy city names and truck types into standardized formats.
        Return ONLY a valid JSON object with two keys: "cities" and "trucks".
        The values should be objects mapping the raw string to the clean string.
        Example: {"cities": {"Bombay": "Mumbai", "MUMBAI": "Mumbai"}, "trucks": {"32ft": "32FT", "32 ft truck": "32FT"}}
        
        Raw Cities: ${cityList}
        Raw Trucks: ${truckList}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonRes = JSON.parse(response.text || '{}');
      cityMap = jsonRes.cities || {};
      truckMap = jsonRes.trucks || {};
      
      // Apply fuzzy matching for any cities that Gemini missed or didn't normalize well
      Array.from(uniqueCities).forEach(c => {
        if (!cityMap[c]) {
          cityMap[c] = fuzzyMatchCity(c, standardCities);
        } else {
          // Ensure the Gemini output is also standardized against our known list if possible
          const cleanName = cityMap[c].toUpperCase();
          const match = fuzzball.extract(cleanName, standardCities, { scorer: fuzzball.ratio, limit: 1 })[0];
          if (match && match[1] > 85) {
            cityMap[c] = match[0];
          }
        }
      });
      
      Array.from(uniqueTrucks).forEach(t => {
        if (!truckMap[t]) {
          truckMap[t] = t.trim().toUpperCase().replace(/\s+/g, '');
        }
      });
      
    } catch (e) {
      console.error("Gemini API error, falling back to basic normalization", e);
      fallbackNormalization(uniqueCities, uniqueTrucks, cityMap, truckMap, standardCities);
    }
  } else {
    fallbackNormalization(uniqueCities, uniqueTrucks, cityMap, truckMap, standardCities);
  }

  return { cityMap, truckMap };
}

function fuzzyMatchCity(rawCity: string, standardCities: string[]): string {
  const normalized = rawCity.trim().toUpperCase();
  
  // Handle common aliases before fuzzy matching
  if (normalized === 'BOMBAY') return 'MUMBAI';
  if (normalized === 'MADRAS') return 'CHENNAI';
  if (normalized === 'CALCUTTA') return 'KOLKATA';
  if (normalized === 'GURGAON') return 'GURUGRAM';
  
  const match = fuzzball.extract(normalized, standardCities, { scorer: fuzzball.ratio, limit: 1 })[0];
  
  // If similarity score is > 75, consider it a match
  if (match && match[1] > 75) {
    return match[0];
  }
  
  return normalized;
}

function fallbackNormalization(uniqueCities: Set<string>, uniqueTrucks: Set<string>, cityMap: Record<string, string>, truckMap: Record<string, string>, standardCities: string[]) {
  Array.from(uniqueCities).forEach(c => {
    cityMap[c] = fuzzyMatchCity(c, standardCities);
  });
  Array.from(uniqueTrucks).forEach(t => truckMap[t] = t.trim().toUpperCase().replace(/\s+/g, ''));
}
