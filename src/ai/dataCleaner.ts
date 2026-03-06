import { GoogleGenAI } from '@google/genai';

export async function normalizeData(uniqueCities: Set<string>, uniqueTrucks: Set<string>) {
  const cityList = Array.from(uniqueCities).join(', ');
  const truckList = Array.from(uniqueTrucks).join(', ');

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
    } catch (e) {
      console.error("Gemini API error, falling back to basic normalization", e);
      fallbackNormalization(uniqueCities, uniqueTrucks, cityMap, truckMap);
    }
  } else {
    fallbackNormalization(uniqueCities, uniqueTrucks, cityMap, truckMap);
  }

  return { cityMap, truckMap };
}

function fallbackNormalization(uniqueCities: Set<string>, uniqueTrucks: Set<string>, cityMap: Record<string, string>, truckMap: Record<string, string>) {
  Array.from(uniqueCities).forEach(c => cityMap[c] = c.trim().toUpperCase());
  Array.from(uniqueTrucks).forEach(t => truckMap[t] = t.trim().toUpperCase().replace(/\\s+/g, ''));
}
