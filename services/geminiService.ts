
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROMPT = `You are an expert in American Sign Language. Transcribe the gesture in the image into a single letter or a short, common word. If no discernible ASL gesture is present, return an empty string. Do not add any extra explanations, formatting, or text. Only return the transcribed character or word.`;

export async function transcribeGesture(base64Image: string): Promise<string> {
  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = {
      text: PROMPT,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        // Disable thinking for lower latency, crucial for real-time applications
        thinkingConfig: { thinkingBudget: 0 },
        // Set a low token limit as we expect a single character or word
        maxOutputTokens: 20, 
      }
    });
    
    const text = response.text.trim();
    // Basic filtering for common model "hallucinations" or refusals
    if (text.toLowerCase().includes("i can't") || text.toLowerCase().includes("cannot")) {
      return "";
    }

    return text;
  } catch (error) {
    console.error("Error transcribing gesture:", error);
    return ""; // Return empty on error to not disrupt the flow
  }
}
