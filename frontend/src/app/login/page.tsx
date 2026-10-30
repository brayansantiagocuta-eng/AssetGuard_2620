"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  KeyRound,
  X,
} from "lucide-react";

const ADMIN_EMAIL = "valesotelo.0806@gmail.com";
const ALLOWED_PWD_REGEX = /^[a-zA-Z0-9@#$*_!%&\-]*$/;
const TAB_EMAIL_KEY = "assetguard_tab_email";
const TAB_REMEMBER_KEY = "assetguard_tab_remember";
const GLOBAL_REMEMBER_KEY = "assetguard_remembered_email";

// Validaciones puras desacopladas del ciclo de vida del componente
const validateEmail = (val: string): string[] => {
  const t = val.trim();
  if (!t) return ["Falta ingresar el correo electrónico."];
  if (!t.includes("@")) return ["Falta el símbolo '@' (ej: usuario@globalnet.com)."];
  const [local, ...domains] = t.split("@");
  const domain = domains.join("@");
  const errors: string[] = [];
  if (!local) errors.push("Falta el usuario antes de '@'.");
  if (!domain || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    errors.push("Falta completar el dominio después de '@' (ej: @globalnet.com).");
  }
  return errors;
};

const validatePasswordRecovery = (pwd: string, confirm: string): string | null => {
  if (pwd.length < 6 || pwd.length > 20) return "La contraseña debe tener entre 6 y 20 caracteres.";
  if (!ALLOWED_PWD_REGEX.test(pwd)) return "Solo se permiten letras, números y símbolos (@, #, $, *, _, -).";
  if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[@#$*_!%&\-]/.test(pwd)) {
    return "La contraseña debe combinar mayúsculas (A-Z), minúsculas (a-z), números (0-9) y símbolos (@, #, $, *, _, -).";
  }
  return pwd !== confirm ? "Las contraseñas no coinciden." : null;
};

export default function LoginPage() {
  const router = useRouter();
  const { login, authError } = useAuth();

  // Estados estructurados por dominio funcional
  const [form, setForm] = useState({
    email: "",
    password: "",
    showPwd: false,
    remember: false,
    isSubmitting: false,
  });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [feedback, setFeedback] = useState<{ err: string | null; success: string | null }>({
    err: null,
    success: null,
  });

  const [showAdminContact, setShowAdminContact] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Estado del Modal de Recuperación Directa
  const [recovery, setRecovery] = useState({
    isOpen: false,
    email: "",
    pwd: "",
    confirm: "",
    showPwd: false,
    showConfirm: false,
    isSubmitting: false,
    err: null as string | null,
    success: null as string | null,
  });

  useEffect(() => {
    setIsMounted(true);
    try {
      const tabEmail = sessionStorage.getItem(TAB_EMAIL_KEY)?.trim();
      const tabRem = sessionStorage.getItem(TAB_REMEMBER_KEY);
      if (tabEmail) {
        const isRem =
          tabRem === "true" ||
          localStorage.getItem(`assetguard_remember_${tabEmail.toLowerCase()}`) === "true";
        setForm((f) => ({ ...f, email: tabEmail, remember: isRem }));
        return;
      }
      const savedEmail = localStorage.getItem(GLOBAL_REMEMBER_KEY)?.trim();
      if (
        savedEmail &&
        localStorage.getItem(`assetguard_remember_${savedEmail.toLowerCase()}`) !== "false"
      ) {
        setForm((f) => ({ ...f, email: savedEmail, remember: true }));
        sessionStorage.setItem(TAB_EMAIL_KEY, savedEmail);
        sessionStorage.setItem(TAB_REMEMBER_KEY, "true");
      }
    } catch {}
  }, []);

  const emailErrors = touched.email ? validateEmail(form.email) : [];
  const passwordErrors = touched.password && !form.password ? ["Ingresa tu contraseña."] : [];

  const handleEmailChange = (val: string) => {
    setForm((f) => ({ ...f, email: val }));
    setFeedback({ err: null, success: null });
    try {
      sessionStorage.setItem(TAB_EMAIL_KEY, val);
      const clean = val.trim().toLowerCase();
      if (clean && localStorage.getItem(`assetguard_remember_${clean}`) === "true") {
        setForm((f) => ({ ...f, remember: true }));
        sessionStorage.setItem(TAB_REMEMBER_KEY, "true");
      }
    } catch {}
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (validateEmail(form.email).length > 0 || !form.password) {
      setFeedback({ err: "Completa los requisitos indicados en los campos.", success: null });
      return;
    }

    setForm((f) => ({ ...f, isSubmitting: true }));
    try {
      const cleanEmail = form.email.trim();
      const res = await login(cleanEmail, form.password);
      if (res.success) {
        sessionStorage.setItem(TAB_EMAIL_KEY, cleanEmail);
        sessionStorage.setItem(TAB_REMEMBER_KEY, String(form.remember));
        const lower = cleanEmail.toLowerCase();
        if (form.remember) {
          localStorage.setItem(`assetguard_remember_${lower}`, "true");
          localStorage.setItem(GLOBAL_REMEMBER_KEY, cleanEmail);
        } else {
          localStorage.removeItem(`assetguard_remember_${lower}`);
          if (localStorage.getItem(GLOBAL_REMEMBER_KEY)?.toLowerCase() === lower) {
            localStorage.removeItem(GLOBAL_REMEMBER_KEY);
          }
        }
        setFeedback({ err: null, success: "¡Acceso concedido! Ingresando..." });
        window.dispatchEvent(new CustomEvent("assetguard:wave-start"));
        setTimeout(() => router.replace("/"), 1150);
      } else {
        setFeedback({ err: res.error || "Correo o contraseña incorrectos.", success: null });
      }
    } finally {
      setForm((f) => ({ ...f, isSubmitting: false }));
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = recovery.email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setRecovery((r) => ({ ...r, err: "Ingresa un correo corporativo válido." }));
      return;
    }
    const pwdErr = validatePasswordRecovery(recovery.pwd, recovery.confirm);
    if (pwdErr) {
      setRecovery((r) => ({ ...r, err: pwdErr }));
      return;
    }

    setRecovery((r) => ({ ...r, isSubmitting: true, err: null }));
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, token: "TOKEN_VERIFIED", newPassword: recovery.pwd }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "No se pudo actualizar la contraseña.");
      setRecovery((r) => ({ ...r, success: "¡Contraseña actualizada exitosamente!" }));
      setForm((f) => ({ ...f, email: cleanEmail, password: recovery.pwd }));
      setFeedback({ err: null, success: null });
      setTimeout(() => {
        setRecovery((r) => ({ ...r, isOpen: false }));
        setFeedback({ err: null, success: "Contraseña actualizada. Puedes ingresar al sistema ahora." });
      }, 1200);
    } catch (err: any) {
      setRecovery((r) => ({ ...r, err: err.message || "Error al actualizar la contraseña." }));
    } finally {
      setRecovery((r) => ({ ...r, isSubmitting: false }));
    }
  };

  const handleCopyAdminEmail = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#E3EAEE] flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col md:flex-row">
        {/* PANEL IZQUIERDO — Identidad Institucional */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#1995AD] via-[#68B2C4] to-[#A1D6E2] flex flex-col items-center justify-center px-8 sm:px-12 py-10 transition-all duration-200">
          <div className="w-full flex flex-col items-center justify-center gap-5">
            <Image
              src="/logo.png"
              alt="AssetGuard 2620 Logo"
              width={460}
              height={300}
              className="h-auto w-[340px] sm:w-[410px] lg:w-[450px] object-contain drop-shadow-md"
              priority
              unoptimized
            />
            <div className="text-center space-y-2">
              <h1 className="font-title text-[clamp(2.2rem,5vw,4.5rem)] text-white tracking-tight leading-none drop-shadow-xs whitespace-nowrap">
                AssetGuard<span className="text-[#172B4D]">_2620</span>
              </h1>
              <p className="font-title text-[clamp(1.1rem,2vw,1.5rem)] text-[#172B4D] tracking-wide whitespace-nowrap">
                GlobalNet Telecom
              </p>
              <p className="text-white font-semibold text-lg sm:text-xl lg:text-2xl leading-snug pt-2 max-w-md mx-auto">
                Sistema centralizado de control de inventario y custodia
              </p>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO — Tarjeta de Inicio de Sesión */}
        <div className="md:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-[#DDE6EC]">
          <div className="w-full max-w-2xl bg-white px-8 sm:px-12 py-7 sm:py-9 rounded-3xl border-2 border-[#1995AD]/45 shadow-2xl shadow-[#172B4D]/15 space-y-5">
            <div className="text-center">
              <h2
                style={{
                  fontFamily: '"Arial Black", "Segoe UI Black", "Montserrat", sans-serif',
                  WebkitTextStroke: "1.5px #172B4D",
                }}
                className="text-4xl sm:text-5xl font-black text-[#172B4D] tracking-tight leading-none"
              >
                Iniciar Sesión
              </h2>
            </div>

            {/* Banners Informativos */}
            {authError && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm text-amber-800 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{authError}</span>
              </div>
            )}
            {feedback.err && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex flex-col gap-1.5 font-medium">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{feedback.err}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback({ ...feedback, err: null })}
                    className="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
                {feedback.err.toLowerCase().includes("intentos") && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecovery((r) => ({ ...r, isOpen: true, email: form.email, err: null }));
                      setFeedback({ ...feedback, err: null });
                    }}
                    className="text-xs text-[#1995AD] font-bold hover:underline self-start mt-0.5 cursor-pointer"
                  >
                    ¿Deseas restablecer tu contraseña ahora? Haz clic aquí
                  </button>
                )}
              </div>
            )}
            {feedback.success && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{feedback.success}</span>
              </div>
            )}

            {/* Formulario de Login */}
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-5">
              <div className="space-y-5">
                {/* CAMPO CORREO */}
                <div
                  className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                    emailErrors.length > 0
                      ? "border-red-400 bg-red-50/40"
                      : "border-[#AFC8D0] bg-[#F1F1F2]/80 focus-within:border-[#1995AD] focus-within:bg-white"
                  }`}
                >
                  <label htmlFor="login-email" className="block text-sm font-bold text-[#172B4D] uppercase tracking-wider mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="h-5 w-5 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      placeholder="usuario@globalnet.com"
                      value={form.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#BCBABE]/80 bg-white text-lg text-[#172B4D] placeholder:text-[#BCBABE] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                    />
                  </div>
                  {emailErrors.length > 0 && (
                    <p className="mt-2 text-xs sm:text-sm font-semibold text-red-600">{emailErrors.join(" ")}</p>
                  )}
                </div>

                {/* CAMPO CONTRASEÑA */}
                <div
                  className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                    passwordErrors.length > 0
                      ? "border-red-400 bg-red-50/40"
                      : "border-[#AFC8D0] bg-[#F1F1F2]/80 focus-within:border-[#1995AD] focus-within:bg-white"
                  }`}
                >
                  <label htmlFor="login-password" className="block text-sm font-bold text-[#172B4D] uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="h-5 w-5 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      name="password"
                      type={form.showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="Ingresa tu contraseña"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-[#BCBABE]/80 bg-white text-lg text-[#172B4D] placeholder:text-[#BCBABE] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, showPwd: !f.showPwd }))}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD] cursor-pointer"
                    >
                      {form.showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordErrors.length > 0 && (
                    <p className="mt-2 text-xs sm:text-sm font-semibold text-red-600">{passwordErrors.join(" ")}</p>
                  )}
                </div>
              </div>

              {/* OPCIONES DE SESIÓN Y RECUPERACIÓN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-sm sm:text-base">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[#172B4D] font-medium select-none">
                    <input
                      type="checkbox"
                      checked={form.remember}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((f) => ({ ...f, remember: checked }));
                        try {
                          sessionStorage.setItem(TAB_REMEMBER_KEY, checked ? "true" : "false");
                          const curEmail = form.email.trim();
                          const lower = curEmail.toLowerCase();
                          if (curEmail) {
                            if (checked) {
                              sessionStorage.setItem(TAB_EMAIL_KEY, curEmail);
                              localStorage.setItem(`assetguard_remember_${lower}`, "true");
                              localStorage.setItem(GLOBAL_REMEMBER_KEY, curEmail);
                            } else {
                              localStorage.removeItem(`assetguard_remember_${lower}`);
                              if (localStorage.getItem(GLOBAL_REMEMBER_KEY)?.toLowerCase() === lower) {
                                localStorage.removeItem(GLOBAL_REMEMBER_KEY);
                              }
                            }
                          }
                        } catch {}
                      }}
                      className="h-4 w-4 rounded border-[#BCBABE] text-[#1995AD] focus:ring-[#1995AD]"
                    />
                    <span>Recordar sesión</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setRecovery({
                        isOpen: true,
                        email: form.email.trim(),
                        pwd: "",
                        confirm: "",
                        showPwd: false,
                        showConfirm: false,
                        isSubmitting: false,
                        err: null,
                        success: null,
                      });
                    }}
                    className="font-bold text-[#1995AD] hover:text-[#172B4D] underline underline-offset-4 cursor-pointer text-xs sm:text-sm inline-block py-1"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* BOTÓN INGRESAR */}
                <button
                  type="submit"
                  disabled={form.isSubmitting}
                  style={{ fontFamily: '"Arial Black", "Segoe UI Black", sans-serif' }}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#1995AD] via-[#AFC8D0] to-[#A1D6E2] text-[#172B4D] font-black text-2xl sm:text-3xl tracking-wide hover:opacity-95 disabled:opacity-60 disabled:cursor-wait shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer"
                >
                  <span>{form.isSubmitting ? "Validando..." : "Ingresar"}</span>
                  <ArrowRight className="h-7 w-7 stroke-[3]" />
                </button>
              </div>
            </form>

            {/* CONTACTO DE ADMINISTRADOR */}
            <div className="pt-3 border-t border-[#F1F1F2] text-center space-y-2.5">
              <p className="text-sm sm:text-base text-[#172B4D]/80">
                ¿Necesitas una cuenta? Contacta al{" "}
                <button
                  type="button"
                  onClick={() => setShowAdminContact(!showAdminContact)}
                  className="font-bold text-[#1995AD] bg-[#A1D6E2]/35 hover:bg-[#A1D6E2]/60 px-2.5 py-0.5 rounded-md underline decoration-[#1995AD] underline-offset-4 transition-colors cursor-pointer"
                >
                  Administrador del Sistema
                </button>
              </p>

              {showAdminContact && (
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-[#F1F1F2] border border-[#1995AD]/50 text-sm">
                  <a href={`mailto:${ADMIN_EMAIL}`} className="font-bold text-[#172B4D] hover:text-[#1995AD]">
                    {ADMIN_EMAIL}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyAdminEmail}
                    className="text-xs font-bold text-[#1995AD] hover:text-[#172B4D] inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAdmin ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE RESTABLECIMIENTO DIRECTO */}
      {isMounted && recovery.isOpen && createPortal(
        <div
          onClick={() => setRecovery((r) => ({ ...r, isOpen: false }))}
          className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#1995AD]/50 flex flex-col overflow-hidden my-auto relative z-10"
          >
            <div className="bg-gradient-to-r from-[#172B4D] via-[#1B4965] to-[#1995AD] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-title text-lg tracking-wide text-white">Recuperar Contraseña</h3>
                  <p className="text-xs text-[#A1D6E2]">Define tu nueva clave de acceso</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecovery((r) => ({ ...r, isOpen: false }))}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecoverySubmit} className="p-5 sm:p-6 space-y-4">
              {recovery.err && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{recovery.err}</span>
                </div>
              )}
              {recovery.success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{recovery.success}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ej: usuario@globalnet.com"
                    value={recovery.email}
                    onChange={(e) => setRecovery((r) => ({ ...r, email: e.target.value, err: null }))}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-white text-sm text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={recovery.showPwd ? "text" : "password"}
                    required
                    maxLength={20}
                    placeholder="Ingresa tu nueva contraseña"
                    value={recovery.pwd}
                    onChange={(e) => {
                      const clean = e.target.value.split("").filter((ch) => ALLOWED_PWD_REGEX.test(ch)).join("").slice(0, 20);
                      setRecovery((r) => ({ ...r, pwd: clean, err: null }));
                    }}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#AFC8D0] bg-white text-sm text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                  />
                  <button
                    type="button"
                    onClick={() => setRecovery((r) => ({ ...r, showPwd: !r.showPwd }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD] cursor-pointer"
                  >
                    {recovery.showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={recovery.showConfirm ? "text" : "password"}
                    required
                    maxLength={20}
                    placeholder="Repite la nueva contraseña"
                    value={recovery.confirm}
                    onChange={(e) => {
                      const clean = e.target.value.split("").filter((ch) => ALLOWED_PWD_REGEX.test(ch)).join("").slice(0, 20);
                      setRecovery((r) => ({ ...r, confirm: clean, err: null }));
                    }}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#AFC8D0] bg-white text-sm text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                  />
                  <button
                    type="button"
                    onClick={() => setRecovery((r) => ({ ...r, showConfirm: !r.showConfirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD] cursor-pointer"
                  >
                    {recovery.showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#F1F1F2]">
                <button
                  type="button"
                  onClick={() => setRecovery((r) => ({ ...r, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl bg-[#F1F1F2] hover:bg-[#BCBABE]/40 text-[#172B4D] font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={recovery.isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {recovery.isSubmitting ? "Guardando..." : "Guardar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Footer */}
      <footer className="bg-[#1995AD] text-white py-3 px-6 text-center text-xs">
        <p className="font-semibold text-white/90">AssetGuard_2620 - GlobalNet Telecom</p>
      </footer>
    </div>
  );
}
