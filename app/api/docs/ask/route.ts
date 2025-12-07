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

    // Detectar saludos simples
    const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'saludos'];
    const isGreeting = greetings.some(g => normalizedQuestion.trim() === g || normalizedQuestion.trim().startsWith(g + ' '));

    if (isGreeting) {
      return NextResponse.json({
        answer: '¡Hola! 👋 Soy el asistente de WorkShift. Estoy aquí para ayudarte con preguntas sobre el sistema de gestión de turnos. ¿En qué puedo ayudarte hoy?',
        sources: []
      });
    }

    // Extraer palabras clave (más flexible)
    const stopWords = ['como', 'puedo', 'hacer', 'para', 'cual', 'donde', 'cuando', 'quien', 'porque', 'que', 'es', 'la', 'el', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'con', 'por'];
    const allWords: string[] = normalizedQuestion.split(' ');
    const keywords: string[] = allWords.filter((w: string) => w.length > 3 && !stopWords.includes(w));

    // Si no hay keywords pero hay pregunta, usar palabras de 3+ caracteres
    if (keywords.length === 0 && allWords.length > 1) {
      keywords.push(...allWords.filter((w: string) => w.length >= 3));
    }

    if (keywords.length === 0) {
      return NextResponse.json({
        answer: 'Por favor, haz una pregunta más específica sobre WorkShift.',
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

      // Crear contexto para Gemini (usar más documentos)
      const context = allResults
        .slice(0, 5) // Aumentado de 3 a 5 para más contexto
        .map((r: any, i: number) => `Documento ${i + 1}: ${r.title}\n${r.content}`)
        .join('\n\n---\n\n');

      const prompt = `Eres un asistente virtual amigable y útil del sistema WorkShift para gestión de turnos laborales.

DOCUMENTACIÓN DISPONIBLE:
${context}

---

INSTRUCCIONES:
1. Responde de forma natural, amigable y conversacional
2. Usa la información de la documentación proporcionada como base
3. Si la documentación contiene información relacionada o similar, úsala para construir una respuesta útil
4. Puedes hacer inferencias razonables basándote en la información disponible
5. Si necesitas relacionar conceptos de diferentes documentos, hazlo de manera natural
6. Sé conciso pero completo - prioriza lo más importante
7. Si hay pasos a seguir, enuméralos claramente
8. Si definitivamente NO hay información sobre el tema preguntado en ningún documento, indícalo claramente y sugiere temas relacionados que sí están disponibles
9. Usa emojis ocasionalmente para hacer la conversación más amigable (sin exagerar)

PREGUNTA DEL USUARIO:
${question}

Tu respuesta (directa, sin preámbulos como "Según la documentación..." - responde como si fueras parte del equipo de soporte):`;

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