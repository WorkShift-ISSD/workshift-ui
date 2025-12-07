// app/lib/ia/gemini.ts
// USANDO SDK ESTABLE @google/generative-ai

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Cache simple para evitar consultas repetidas
const cache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function createAnswer(prompt: string): Promise<string> {
  // Verificar caché primero
  const cached = cache.get(prompt);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("📦 Respuesta desde caché");
    return cached.text;
  }

  // Modelos disponibles (probados y funcionando)
  const modelsToTry = [
    "gemini-2.5-flash",
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🔍 Intentando modelo: ${modelName}`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ Funcionó con: ${modelName}`);
      
      // Guardar en caché
      cache.set(prompt, { text, timestamp: Date.now() });
      
      return text;

    } catch (error: any) {
      console.log(`❌ Falló ${modelName}:`, error.message);
      lastError = error;

      // Si es error 429 (Too Many Requests)
      if (error.status === 429) {
        console.error('⏳ Límite de cuota excedido');
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      // Si es error 400/401 (API Key inválida)
      if (error.status === 400 || error.status === 401) {
        console.error('🔑 API Key inválida o expirada');
        throw new Error('INVALID_API_KEY');
      }

      // Continuar con el siguiente modelo
      continue;
    }
  }

  console.error('❌ Ningún modelo funcionó');
  throw lastError || new Error('Todos los modelos fallaron');
}

// Función para limpiar caché
export function clearCache() {
  cache.clear();
  console.log('🧹 Caché limpiado');
}