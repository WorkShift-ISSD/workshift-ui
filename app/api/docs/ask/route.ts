import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { createEmbedding, createAnswer } from '@/app/lib/ia/openai';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Falta question' }, { status: 400 });
    }

    const qEmb = await createEmbedding(question);

    // Buscar los fragments más similares
    const rows = await sql`
      SELECT id::text, title, content
      FROM docs_help
      ORDER BY embedding <=> ${qEmb}::vector
      LIMIT 5
    `;

    const context = rows
      .map((r, i) => `Fuente ${i + 1} - ${r.title}\n${r.content}`)
      .join("\n\n---\n\n");

    const prompt = `
Sos un asistente del sistema WorkShift.
Respondé usando SOLO esta documentación:

${context}

Pregunta:
${question}

Si la documentación no tiene la respuesta decí: "No está en la documentación".
`;

    const answer = await createAnswer(prompt);

    return NextResponse.json({
      answer,
      sources: rows.map(r => ({ id: r.id, title: r.title }))
    });
  } catch (err: any) {
    console.error("Error IA:", err);
    return NextResponse.json(
      { error: "Error interno en el asistente" },
      { status: 500 }
    );
  }
}
