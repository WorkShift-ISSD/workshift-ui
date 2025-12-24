// app/api/autorizaciones/[id]/aprobar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { EstadoAutorizacion } from '@/app/lib/enum';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { observaciones } = body;

    // Verificar autenticación
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const jefeId = payload.id as string;
    const jefeRol = payload.rol as string;

    // Verificar que sea JEFE
    if (jefeRol !== 'JEFE' && jefeRol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'Solo el Jefe puede aprobar autorizaciones' },
        { status: 403 }
      );
    }

    // Obtener la autorización
    const [autorizacion] = await sql`
      SELECT * FROM autorizaciones WHERE id = ${id}::uuid;
    `;

    if (!autorizacion) {
      return NextResponse.json(
        { error: 'Autorización no encontrada' },
        { status: 404 }
      );
    }

    if (autorizacion.estado !== EstadoAutorizacion.PENDIENTE) {
      return NextResponse.json(
        { error: 'Esta autorización ya fue procesada' },
        { status: 400 }
      );
    }

    // Aprobar autorización
    await sql`
      UPDATE autorizaciones
      SET
        estado = ${EstadoAutorizacion.APROBADA},
        aprobado_por = ${jefeId}::uuid,
        fecha_aprobacion = NOW(),
        observaciones = COALESCE(${observaciones}, observaciones),
        updated_at = NOW()
      WHERE id = ${id}::uuid;
    `;

    // ✅ ACTUALIZAR ESTADO DE LA SOLICITUD/OFERTA/LICENCIA VINCULADA
    if (autorizacion.solicitud_id) {
      await sql`
        UPDATE solicitudes_directas
        SET estado = 'COMPLETADO', updated_at = NOW()
        WHERE id = ${autorizacion.solicitud_id}::uuid;
      `;
      console.log('✅ Solicitud directa actualizada a COMPLETADO');
    }

    if (autorizacion.oferta_id) {
      await sql`
        UPDATE ofertas
        SET estado = 'COMPLETADO', updated_at = NOW()
        WHERE id = ${autorizacion.oferta_id}::uuid;
      `;
      console.log('✅ Oferta actualizada a COMPLETADO');
    }

    if (autorizacion.licencia_id) {
      await sql`
        UPDATE licencias
        SET estado = 'APROBADA', updated_at = NOW()
        WHERE id = ${autorizacion.licencia_id}::uuid;
      `;
      console.log('✅ Licencia actualizada a APROBADA');
    }

    return NextResponse.json({
      message: 'Autorización aprobada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al aprobar autorización:', error);
    return NextResponse.json(
      { 
        error: 'Error al aprobar autorización',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}