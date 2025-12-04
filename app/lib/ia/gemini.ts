// app/lib/ia/gemini.ts
// VERSIÓN CON AUTO-DETECCIÓN

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function createAnswer(prompt: string): Promise<string> {
  // Lista de modelos a probar
  const modelsToTry = [
    
    "gemini-2.5-pro",
    "models/gemini-2.5-pro",
    "gemini-3.0",
    "models/gemini-3.0",
    "gemini-3.0-pro",
    "models/gemini-3.0-pro"
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🔍 Intentando modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      console.log(`✅ ¡Funcionó con: ${modelName}!`);
      return text;
    } catch (error: any) {
      console.log(`❌ Falló ${modelName}`);
      lastError = error;
    }
  }

  console.error('❌ Ningún modelo funcionó');
  throw lastError;
}