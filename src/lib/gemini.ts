import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const geminiModel = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function getAIReasoning(prompt: string) {
  if (!geminiModel) {
    console.warn("Gemini model not initialized. Set GEMINI_API_KEY in environment.");
    return null;
  }

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
}
