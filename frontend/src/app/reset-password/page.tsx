"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

const ALLOWED_PASSWORD_REGEX = /^[a-zA-Z0-9$!#%&]*$/;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getPasswordErrors = (pwd: string): string[] => {
    if (!pwd) return ["La contraseña es obligatoria."];
    if (pwd.length < 6) return [`Faltan ${6 - pwd.length} caracteres (mínimo 6).`];
    if (pwd.length > 20) return ["Máximo 20 caracteres permitidos."];
    if (!ALLOWED_PASSWORD_REGEX.test(pwd)) {
      return ["Solo se permiten letras, números y signos ($!#%&)."];
    }
    return [];
  };

  const handlePasswordInput = (value: string, setter: (v: string) => void) => {
    const sanitized = value
      .split("")
      .filter((ch) => ALLOWED_PASSWORD_REGEX.test(ch))
      .join("")
      .slice(0, 20);
    setter(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      setErrorMsg("Debe ingresar un correo electrónico válido.");
      return;
    }

    const pwdErrs = getPasswordErrors(newPassword);
    if (pwdErrs.length > 0) {
      setErrorMsg(pwdErrs.join(" "));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          token: token || "TOKEN_VERIFIED",
          newPassword: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || "No se pudo actualizar la contraseña.");
      }

      setSuccessMsg(
        "¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[#1995AD]/40 shadow-2xl p-7 sm:p-9 space-y-6">
      <div className="text-center space-y-2">
        <div className="h-14 w-14 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 text-[#1995AD] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="font-title text-2xl sm:text-3xl text-[#172B4D] tracking-tight">
          Cambiar Contraseña
        </h1>
        <p className="text-xs sm:text-sm text-[#172B4D]/70">
          Ingresa tu correo y define tu nueva contraseña para acceder al sistema.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs sm:text-sm text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {!successMsg && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              placeholder="ej: usuario@globalnet.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-white text-sm text-[#172B4D] font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
              Nueva Contraseña (6-20 caracteres)
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                maxLength={20}
                placeholder="Ingresa tu nueva contraseña"
                value={newPassword}
                onChange={(e) => handlePasswordInput(e.target.value, setNewPassword)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                maxLength={20}
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => handlePasswordInput(e.target.value, setConfirmPassword)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD]"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? "Guardando..." : "Guardar Contraseña"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs font-bold text-[#1995AD] hover:underline">
          Volver a Iniciar Sesión
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F1F1F2] flex flex-col justify-between items-center p-4">
      <div className="h-6" />

      <Suspense fallback={<div className="text-center p-8 text-sm font-semibold text-[#172B4D]">Cargando módulo de restablecimiento...</div>}>
        <ResetPasswordContent />
      </Suspense>

      <footer className="text-xs text-[#172B4D]/60 py-4">
        AssetGuard_2620 - GlobalNet Telecom
      </footer>
    </div>
  );
}
