
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Standardized client initialization using named parameter as per GenAI SDK guidelines.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Handles text-based queries with support for Google Search and Google Maps grounding.
export const generateChatResponse = async (prompt: string, useSearch = false, useMaps = false, coords?: { lat: number, lng: number }) => {
  const ai = getAI();
  const tools: any[] = [];
  
  if (useSearch) tools.push({ googleSearch: {} });
  if (useMaps) tools.push({ googleMaps: {} });

  const config: any = {
    tools,
  };

  // Maps grounding configuration, including user location if provided for spatial relevance.
  if (useMaps && coords) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: coords.lat,
          longitude: coords.lng
        }
      }
    };
  }

  // Maps grounding is only supported in Gemini 2.5 series models.
  // Basic Text Tasks use gemini-3-flash-preview.
  const model = useMaps ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config
  });

  // Extract grounding information (URLs and titles) for search and maps grounding results.
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = groundingChunks.map((chunk: any) => {
    if (chunk.web) return { title: chunk.web.title, uri: chunk.web.uri };
    if (chunk.maps) return { title: chunk.maps.title, uri: chunk.maps.uri };
    return null;
  }).filter(Boolean);

  return {
    text: response.text || "No response generated.",
    links: links as { title: string, uri: string }[]
  };
};

// Generates high-quality images using the Gemini 2.5 Flash Image model.
export const generateImage = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  // Iterate through response parts to locate and extract the base64 image data.
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data found in response");
};

// Initiates a video generation operation using Veo 3.1.
export const startVideoGeneration = async (prompt: string) => {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
  return operation;
};

// Polls the status of a pending video generation operation.
export const pollVideoOperation = async (operation: any) => {
  const ai = getAI();
  return await ai.operations.getVideosOperation({ operation });
};

// Establishes a Live API session for low-latency, real-time voice conversations.
export const getLiveSession = async (callbacks: any) => {
  const ai = getAI();
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
      },
      systemInstruction: 'You are Ughbot, a friendly and helpful multi-modal assistant. Respond naturally and help the user with their requests.'
    }
  });
};
