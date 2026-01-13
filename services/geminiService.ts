
import { GoogleGenAI, Type } from "@google/genai";
import { ItemStatus, ShoppingItem, StorePrice, StoreLocation } from "../types";

export const resolveLocation = async (locationName: string): Promise<{ lat: number; lng: number; name: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find the approximate latitude and longitude for the location: "${locationName}". Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          name: { type: Type.STRING }
        },
        required: ["lat", "lng", "name"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { lat: 40.7128, lng: -74.0060, name: locationName };
  }
};

export const refineItem = async (itemName: string): Promise<{ refinedName: string; emoji: string; isVague: boolean; suggestions: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze: "${itemName}". Return JSON with refinedName, emoji, isVague (boolean), and suggestions (array).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          refinedName: { type: Type.STRING },
          emoji: { type: Type.STRING },
          isVague: { type: Type.BOOLEAN },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["refinedName", "emoji", "isVague", "suggestions"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { refinedName: itemName, emoji: '🛒', isVague: false, suggestions: [] };
  }
};

export const searchPrices = async (itemName: string, locationStr: string): Promise<StorePrice[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // OPTIMIZATION: Combine search and structure into one request
  // We use a high-precision prompt that forces structured output from the grounding results immediately.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find current prices for "${itemName}" at major supermarkets near ${locationStr}. 
    Return ONLY a JSON array of objects with keys: storeName, price (number), currency, and url. 
    If no specific price is found for a store, omit it from the array.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING },
            price: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            url: { type: Type.STRING }
          },
          required: ["storeName", "price"]
        }
      }
    }
  });

  try {
    const text = response.text || '[]';
    // Sometimes the model wraps JSON in markdown blocks even when told not to
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Price parsing failed", e);
    return [];
  }
};

export const getStoreLocations = async (stores: string[], userLat: number, userLng: number): Promise<StoreLocation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find exact Google Maps locations for these stores: ${stores.join(', ')} near lat:${userLat}, lng:${userLng}.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: userLat,
            longitude: userLng
          }
        }
      }
    }
  });

  const locations: StoreLocation[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  chunks.forEach((chunk: any) => {
    if (chunk.maps) {
      locations.push({
        storeName: chunk.maps.title || 'Unknown Store',
        address: chunk.maps.address || '',
        distanceKm: 1.2, // Rough estimate as Maps tool doesn't always return direct distance
        mapsUri: chunk.maps.uri
      });
    }
  });

  return locations;
};
