import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getRecommendedTracks(currentTracks: { title: string, artist: string }[]): Promise<{ title: string, artist: string, reason: string }[]> {
  try {
    const trackList = currentTracks.map(t => `${t.title} by ${t.artist}`).join(", ");
    const prompt = `Based on these tracks: ${trackList || "no tracks yet, suggest some popular upbeat electronic/pop tracks"}, recommend 5 similar tracks that would fit well in this room.
    Return ONLY a JSON array of objects with the keys "title", "artist", and "reason" (a short 1-sentence reason why it fits). No markdown formatting, just raw JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "[]";
    // Strip possible markdown code blocks
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return [];
  }
}
