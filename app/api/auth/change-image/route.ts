import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/app/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No se envió ninguna imagen" }, { status: 400 });
    }

    // Convertir Blob a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subida directa a Cloudinary usando data URI
    const result = await cloudinary.uploader.upload(`data:${file.type};base64,${buffer.toString("base64")}`, {
      folder: "usuarios",
      use_filename: true,
      unique_filename: true,
    });

    // Guardar result.secure_url en la DB
    return NextResponse.json({ url: result.secure_url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Error subiendo imagen" }, { status: 500 });
  }
}
