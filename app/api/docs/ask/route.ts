import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { createAnswer } from '@/app/lib/ia/gemini';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Falta question' }, { status: 400 });
    }

    console.log('🤖 Pregunta recibida:', question);

    // Verificar API Key
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY no configurada');
      return NextResponse.json({ 
        error: 'Gemini API no configurada',
        answer: 'El asistente no está configurado. Por favor contacta al administrador.'
      }, { status: 500 });
    }

    // Normalizar pregunta
    const normalizedQuestion = question
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!]/g, '');

    // Extraer palabras clave
    const allWords: string[] = normalizedQuestion.split(' ');
    const keywords: string[] = allWords.filter((w: string) => w.length > 3);

    if (keywords.length === 0) {
      return NextResponse.json({
        answer: 'Por favor, haz una pregunta más específica.',
        sources: []
      });
    }

    try {
      // Buscar documentos relevantes
      let allResults: any[] = [];

      for (const keyword of keywords) {
        const pattern = `%${keyword}%`;
        
        const results = await sql`
          SELECT 
            id::text, 
            title, 
            content
          FROM docs_help
          WHERE 
            LOWER(title) LIKE ${pattern}
            OR LOWER(content) LIKE ${pattern}
        `;

        for (const result of results) {
          const exists = allResults.find((r: any) => r.id === result.id);
          if (!exists) {
            allResults.push(result);
          }
        }

        if (allResults.length >= 5) {
          break;
        }
      }

      console.log(`✅ Encontrados ${allResults.length} documentos`);

      if (allResults.length === 0) {
        return NextResponse.json({
          answer: `No encontré información específica sobre "${question}" en la documentación.

Temas disponibles:
- Cambios de turno y solicitudes directas
- Ofertas de turno
- Roles y permisos (Inspector, Supervisor, Jefe)
- Estados de solicitudes
- Gestión de empleados
- Informes y reportes
- Recuperación de contraseña

Por favor reformula tu pregunta o contacta a tu supervisor.`,
          sources: []
        });
      }

      // Crear contexto para Gemini
      const context = allResults
        .slice(0, 3)
        .map((r: any, i: number) => `Documento ${i + 1}: ${r.title}\n${r.content}`)
        .join('\n\n---\n\n');

      const prompt = `Eres un asistente del sistema WorkShift para gestión de turnos laborales.

Tu trabajo es responder preguntas usando ÚNICAMENTE la siguiente documentación oficial del sistema:

${context}

Reglas importantes:
1. Responde SOLO con información de la documentación proporcionada
2. Sé conciso pero completo
3. Si la información no está en la documentación, di: "No tengo esa información en la documentación disponible"
4. Usa un tono profesional pero amigable
5. Si hay pasos, enuméralos claramente

Pregunta del usuario:
${question}

Tu respuesta:`;

      console.log('🤖 Generando respuesta con Gemini...');
      const answer = await createAnswer(prompt);
      console.log('✅ Respuesta generada');

      return NextResponse.json({
        answer,
        sources: allResults.slice(0, 3).map((r: any) => ({ 
          id: r.id, 
          title: r.title
        }))
      });

    } catch (dbError: any) {
      console.error('❌ Error:', dbError);
      
      return NextResponse.json({
        answer: 'Error al procesar tu pregunta. Por favor intenta de nuevo.',
        sources: []
      }, { status: 500 });
    }

  } catch (err: any) {
    console.error("❌ Error general:", err);
    return NextResponse.json(
      { 
        error: "Error interno",
        answer: "Hubo un error. Por favor intenta de nuevo."
      },
      { status: 500 }
    );
  }
}