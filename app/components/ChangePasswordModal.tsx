// app/components/ChangePasswordModal.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  isPrimerIngreso: boolean;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ 
  isOpen, 
  isPrimerIngreso,
  onSuccess 
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calcular fortaleza de contraseña
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    setPasswordStrength(Math.min(strength, 5));
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    calculatePasswordStrength(value);
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return "Débil";
    if (passwordStrength <= 3) return "Media";
    return "Fuerte";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (!isPrimerIngreso && !currentPassword) {
      setError("Ingresa tu contraseña actual");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError("La contraseña debe contener al menos una mayúscula, una minúscula y un número");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: isPrimerIngreso ? undefined : currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cambiar contraseña");
      }

      // Éxito
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isPrimerIngreso ? "Configura tu Contraseña" : "Cambiar Contraseña"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {isPrimerIngreso 
              ? "Por seguridad, debes establecer una nueva contraseña" 
              : "Actualiza tu contraseña de acceso"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña Actual (solo si NO es primer ingreso) */}
          {!isPrimerIngreso && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  required={!isPrimerIngreso}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {/* Indicador de fortaleza */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Fortaleza:</span>
                  <span className={`font-medium ${
                    passwordStrength <= 1 ? 'text-red-600' :
                    passwordStrength <= 3 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {getStrengthText()}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Requisitos */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-4 w-4 ${newPassword.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Mínimo 8 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-4 w-4 ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Una mayúscula
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-4 w-4 ${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={/[a-z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Una minúscula
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-4 w-4 ${/\d/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={/\d/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Un número
                </span>
              </div>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Las contraseñas no coinciden
              </p>
            )}
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Actualizando...
              </>
            ) : (
              "Actualizar Contraseña"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}