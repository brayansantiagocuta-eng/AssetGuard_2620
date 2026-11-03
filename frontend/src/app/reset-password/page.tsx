"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";
import { recordAuditEvent } from "@/lib/auditLogger";

const ALLOWED_PASSWORD_REGEX = /^[a-zA-Z0-9$!#%&]*$/;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  // Estado de validación del enlace
  const [tokenStatus, setTokenStatus] = useState<"CHECKING" | "VALID" | "INVALID">(() => {
    if (!token || !initialEmail) return "INVALID";
    return "CHECKING";
  });
  const [tokenError, setTokenError] = useState<string | null>(() => {
    if (!token || !initialEmail) {
      return "Para cambiar tu contraseña de forma segura, debes acceder exclusivamente mediante el enlace único enviado a tu correo electrónico corporativo.";
    }
    return null;
  });

  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Verificación obligatoria de token contra el backend al cargar la página
  useEffect(() => {
    if (!token || !initialEmail) {
      setTokenStatus("INVALID");
      setTokenError(
        "No se detectó un enlace de verificación válido. Por seguridad institucional, no es posible acceder directamente a este formulario sin el enlace enviado a tu correo."
      );
      return;
    }

    let isSubscribed = true;
    const verifyTokenOnServer = async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-reset-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(initialEmail)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!isSubscribed) return;

        if (res.ok && data.valid) {
          setTokenStatus("VALID");
          setTokenError(null);
          setEmail(initialEmail);
        } else {
          setTokenStatus("INVALID");
          setTokenError(
            data.message ||
              "El enlace de recuperación es inválido, ya fue utilizado o ha expirado (validez máxima de 30 minutos). Por favor solicita uno nuevo desde el inicio de sesión."
          );
        }
      } catch (err) {
        if (!isSubscribed) return;
        setTokenStatus("INVALID");
        setTokenError("No se pudo verificar la validez del enlace con el servidor de seguridad.");
      }
    };

    verifyTokenOnServer();
    return () => {
      isSubscribed = false;
    };
  }, [token, initialEmail]);

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
          token: token,
          newPassword: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || "No se pudo actualizar la contraseña.");
      }

      const displayName = data.userName || emailTrimmed;

      // Registrar en la bitácora y enviar notificación simple al Administrador
      recordAuditEvent({
        userName: displayName,
        userRole: "Usuario",
        actionCode: "PASSWORD_RESET_COMPLETED",
        actionTitle: "Cambio de Contraseña",
        actionDescription: `El usuario ${displayName} (${emailTrimmed}) cambió su contraseña exitosamente.`,
        actionCategory: "USER",
        entityName: emailTrimmed,
      });

      try {
        const rawNotices = localStorage.getItem("assetguard_admin_notifications");
        const existingNotices = rawNotices ? JSON.parse(rawNotices) : [];
        const newNotice = {
          id: `PWD-CHG-${Date.now()}`,
          message: `El usuario ${displayName} (${emailTrimmed}) ha cambiado su contraseña.`,
          createdAt: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        };
        localStorage.setItem(
          "assetguard_admin_notifications",
          JSON.stringify([newNotice, ...existingNotices].slice(0, 10))
        );
      } catch {}

      setSuccessMsg(
        "¡Contraseña actualizada con éxito! Se ha notificado al administrador. Redirigiendo al inicio de sesión..."
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

  // 1. PANTALLA DE CARGA / VERIFICACIÓN DEL ENLACE
  if (tokenStatus === "CHECKING") {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[#1995AD]/40 shadow-2xl p-7 sm:p-9 space-y-5 text-center">
        <div className="h-14 w-14 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 text-[#1995AD] flex items-center justify-center mx-auto animate-pulse">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-title text-xl text-[#172B4D]">Verificando Enlace de Seguridad</h2>
          <p className="text-xs text-[#172B4D]/70">Comprobando validez y vigencia del token de correo...</p>
        </div>
      </div>
    );
  }

  // 2. PANTALLA DE BLOQUEO DE SEGURIDAD (Acceso directo no permitido o token inválido)
  if (tokenStatus === "INVALID") {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-red-200 shadow-2xl p-7 sm:p-9 space-y-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-title text-xl sm:text-2xl text-[#172B4D] tracking-tight">
            Acceso Restringido o Enlace Expirado
          </h1>
          <p className="text-xs sm:text-sm text-[#172B4D]/75 leading-relaxed">
            {tokenError}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F1F1F2] border border-[#AFC8D0]/60 text-xs text-[#172B4D]/80">
          Los enlaces de recuperación tienen una vigencia de <strong>30 minutos</strong> y son de <strong>un solo uso</strong>.
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-3.5 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ir a Inicio de Sesión y Solicitar Enlace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 3. INTERFAZ ACTUAL DE CAMBIAR CONTRASEÑA (Habilitada únicamente con enlace válido)
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
              readOnly={!!initialEmail}
              placeholder="ej: usuario@globalnet.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/60 text-sm text-[#172B4D] font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
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
