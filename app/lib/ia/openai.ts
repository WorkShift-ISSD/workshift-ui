// app/lib/ia/openai.ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function createEmbedding(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

export async function createAnswer(prompt: string) {
  // Usamos chat completions (gpt-4o-mini or gpt-4o if available) o text completion
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini", // o "gpt-4o" / ajustar según disponibilidad
    messages: [{ role: "user", content: prompt }],
    max_tokens: 700,
  });

  return res.choices?.[0]?.message?.content ?? '';
}
