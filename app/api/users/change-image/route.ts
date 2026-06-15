import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/app/lib/cloudinary";
import { sql } from "@/app/lib/postgres";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  console.log("🔵 [DEBUG] Inicio de /api/users/change-image");

  try {
    // 1. OBTENER USUARIO DE LA SESIÓN
    console.log("🔵 [DEBUG] Verificando autenticación...");
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    const authCheck = await fetch(`${req.nextUrl.origin}/api/auth/me`, {
      headers: {
        Cookie: `auth-token=${token}` // ✅ Pasar la cookie explícitamente
      },
    });

    console.log("🔵 [DEBUG] Status de /api/auth/me:", authCheck.status);

    if (!authCheck.ok) {
      console.log("❌ [ERROR] Usuario no autenticado");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const authData = await authCheck.json();
    console.log("🔵 [DEBUG] Usuario obtenido:", authData.user?.email);

    const sessionUser = authData.user;

    // 2. OBTENER ARCHIVO
    console.log("🔵 [DEBUG] Obteniendo archivo del formData...");
    const formData = await req.formData();
    const file = formData.get("image") as Blob;

    if (!file) {
      console.log("❌ [ERROR] No se envió archivo");
      return NextResponse.json({ error: "No se envió imagen" }, { status: 400 });
    }

    console.log("🔵 [DEBUG] Archivo recibido - Tipo:", file.type, "Tamaño:", file.size);

    // 3. VALIDACIONES
    if (!file.type.startsWith("image/")) {
      console.log("❌ [ERROR] Tipo de archivo inválido:", file.type);
      return NextResponse.json({ error: "Debe ser una imagen" }, { status: 400 });
    }

    if (file.size > 3 * 1024 * 1024) {
      console.log("❌ [ERROR] Archivo muy grande:", file.size);
      return NextResponse.json({ error: "Máximo 3MB" }, { status: 400 });
    }

    // 4. OBTENER IMAGEN ANTERIOR
    console.log("🔵 [DEBUG] Consultando BD para usuario:", sessionUser.id);

    const [currentUser] = await sql`
      SELECT cloudinary_public_id 
      FROM users 
      WHERE id = ${sessionUser.id}
    `;

    console.log("🔵 [DEBUG] Usuario encontrado en BD:", currentUser ? "Sí" : "No");
    console.log("🔵 [DEBUG] Cloudinary ID anterior:", currentUser?.cloudinary_public_id || "ninguno");

    // 5. SUBIR A CLOUDINARY
    console.log("🔵 [DEBUG] Preparando subida a Cloudinary...");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("🔵 [DEBUG] Buffer creado, tamaño:", buffer.length);
    console.log("🔵 [DEBUG] Cloudinary config:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✅" : "❌",
      api_key: process.env.CLOUDINARY_API_KEY ? "✅" : "❌",
      api_secret: process.env.CLOUDINARY_API_SECRET ? "✅" : "❌"
    });

    console.log("🔵 [DEBUG] Subiendo a Cloudinary...");
    const result = await cloudinary.uploader.upload(
      `data:${file.type};base64,${buffer.toString("base64")}`,
      {
        folder: "usuarios",
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto:good" }
        ]
      }
    );

    console.log("🔵 [DEBUG] Imagen subida exitosamente:", result.secure_url);
    console.log("🔵 [DEBUG] Public ID:", result.public_id);

    // 6. ACTUALIZAR BD
    console.log("🔵 [DEBUG] Actualizando BD...");

    await sql`
      UPDATE users
      SET
        foto_perfil = ${result.secure_url},
        cloudinary_public_id = ${result.public_id}
      WHERE id = ${sessionUser.id}
    `;

    console.log("🔵 [DEBUG] BD actualizada exitosamente");

    // 7. ELIMINAR IMAGEN ANTERIOR
    if (currentUser?.cloudinary_public_id) {
      console.log("🔵 [DEBUG] Eliminando imagen anterior:", currentUser.cloudinary_public_id);
      try {
        await cloudinary.uploader.destroy(currentUser.cloudinary_public_id);
        console.log("🔵 [DEBUG] Imagen anterior eliminada");
      } catch (err) {
        console.warn("⚠️ [WARN] Error eliminando imagen anterior:", err);
      }
    }

    console.log("✅ [SUCCESS] Proceso completado exitosamente");

    return NextResponse.json({
      url: result.secure_url,
      message: "Imagen actualizada correctamente"
    });

  } catch (err: any) {
    console.error("❌ [ERROR] Error en /api/users/change-image:");
    console.error("Nombre del error:", err.name);
    console.error("Mensaje:", err.message);
    console.error("Stack:", err.stack);

    if (err.http_code) {
      console.error("HTTP Code:", err.http_code);
      console.error("Error Cloudinary:", err);
    }

    return NextResponse.json(
      {
        error: "Error al subir imagen",
        details: err.message // Agregar detalles en desarrollo
      },
      { status: 500 }
    );
  }
}