// app/api/autorizaciones/[id]/rechazar/route.ts
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

    if (!observaciones || observaciones.trim().length < 10) {
      return NextResponse.json(
        { error: 'Debe especificar el motivo del rechazo (mínimo 10 caracteres)' },
        { status: 400 }
      );
    }

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
        { error: 'Solo el Jefe puede rechazar autorizaciones' },
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

    // Rechazar autorización
    await sql`
      UPDATE autorizaciones
      SET
        estado = ${EstadoAutorizacion.RECHAZADA},
        aprobado_por = ${jefeId}::uuid,
        fecha_aprobacion = NOW(),
        observaciones = ${observaciones},
        updated_at = NOW()
      WHERE id = ${id}::uuid;
    `;

    // ✅ ACTUALIZAR ESTADO DE LA SOLICITUD/OFERTA/LICENCIA VINCULADA
    if (autorizacion.solicitud_id) {
      await sql`
        UPDATE solicitudes_directas
        SET estado = 'RECHAZADO', updated_at = NOW()
        WHERE id = ${autorizacion.solicitud_id}::uuid;
      `;
      console.log('✅ Solicitud directa actualizada a RECHAZADO');
    }

    if (autorizacion.oferta_id) {
      await sql`
        UPDATE ofertas
        SET estado = 'CANCELADO', updated_at = NOW()
        WHERE id = ${autorizacion.oferta_id}::uuid;
      `;
      console.log('✅ Oferta actualizada a CANCELADO');
    }

    if (autorizacion.licencia_id) {
      await sql`
        UPDATE licencias
        SET estado = 'RECHAZADA', updated_at = NOW()
        WHERE id = ${autorizacion.licencia_id}::uuid;
      `;
      console.log('✅ Licencia actualizada a RECHAZADA');
    }

    return NextResponse.json({
      message: 'Autorización rechazada'
    });
  } catch (error) {
    console.error('❌ Error al rechazar autorización:', error);
    return NextResponse.json(
      { 
        error: 'Error al rechazar autorización',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}