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

    if (!selected.type.startsWith("image/")) {
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

      const res = await fetch("/api/user/change-image", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar imagen");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700 relative">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            Sube una nueva imagen de perfil
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Imagen actual + nueva */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Actual</p>
            <img
              src={currentImage || "/default-user.jpg"}
              className="w-20 h-20 rounded-full object-cover border"
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Nueva</p>
            {preview ? (
              <img
                src={preview}
                className="w-20 h-20 rounded-full object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                <ImageIcon size={28} />
              </div>
            )}
          </div>
        </div>

        {/* Input archivo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Selecciona una imagen
          </label>
          <input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={handleFileChange}
            className="w-full text-sm text-gray-800 dark:text-gray-200"
          />
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Guardando...
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
