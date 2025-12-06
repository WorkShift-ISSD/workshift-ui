"use client";

import { useState } from "react";
import { Image as ImageIcon, X, AlertCircle } from "lucide-react";

interface ChangeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentImage?: string | null;
}

export default function ChangeImageModal({
  isOpen,
  onClose,
  onSuccess,
  currentImage
}: ChangeImageModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validaciones
    const maxSize = 3 * 1024 * 1024; // 3MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(selected.type)) {
      setError("El archivo debe ser una imagen (JPG, PNG, WebP)");
      return;
    }

    if (selected.size > maxSize) {
      setError("La imagen no puede superar los 3MB");
      return;
    }

    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Selecciona una imagen para continuar");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      // ✅ CORREGIDO: Ruta correcta
      const res = await fetch("/api/users/change-image", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar imagen");

      // Limpiar el preview local
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      
      // data.url contiene la URL de Cloudinary
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Limpiar el preview al cerrar
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setError("");
    onClose();
  };

  // Helper para imagen por defecto
  const getDefaultAvatar = () => {
    return "https://ui-avatars.com/api/?name=Usuario&size=200&background=3b82f6&color=fff&bold=true";
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700 relative">

        {/* Botón Cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
          disabled={loading}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Cambiar Imagen
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Sube una nueva imagen de perfil (máx. 3MB)
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Imagen actual + nueva */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {/* Imagen actual */}
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Actual</p>
            <img
              src={currentImage || getDefaultAvatar()}
              alt="Imagen actual"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
          </div>

          {/* Flecha */}
          <div className="text-gray-400 dark:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* Imagen nueva */}
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Nueva</p>
            {preview ? (
              <img
                src={preview}
                alt="Vista previa"
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 dark:border-blue-400"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600">
                <ImageIcon size={28} />
              </div>
            )}
          </div>
        </div>

        {/* Input archivo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selecciona una imagen
          </label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            disabled={loading}
            onChange={handleFileChange}
            className="w-full text-sm text-gray-800 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 dark:hover:file:bg-blue-900/50 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Formatos: JPG, PNG, WebP
          </p>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Subiendo...
              </>
            ) : (
              "Actualizar Imagen"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}