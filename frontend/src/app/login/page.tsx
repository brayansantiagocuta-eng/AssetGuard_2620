"use client";

import React, { useState, useEffect } from "react";
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
  Send,
  Copy,
  Check,
} from "lucide-react";

const ADMIN_EMAIL = "admin@globalnet.com";
const ALLOWED_PASSWORD_REGEX = /^[a-zA-Z0-9$!#%&]*$/;
const REMEMBER_STORAGE_KEY = "assetguard_remembered_credentials";

export default function LoginPage() {
  const router = useRouter();
  const { login, authError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Cargar correo y contraseña recordados al abrir la página
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email) setLoginEmail(parsed.email);
        if (parsed?.password) setLoginPassword(parsed.password);
        setRememberMe(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Validation states on finish typing (onBlur) & invalid character feedback
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [invalidCharNotice, setInvalidCharNotice] = useState<string | null>(null);

  // Password recovery & Admin contact states
  const [showRecoveryBox, setShowRecoveryBox] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryNote, setRecoveryNote] = useState("");
  const [recoverySentMsg, setRecoverySentMsg] = useState<string | null>(null);
  const [showAdminContact, setShowAdminContact] = useState(false);
  const [copiedAdminEmail, setCopiedAdminEmail] = useState(false);

  const getEmailValidationErrors = (value: string): string[] => {
    const trimmed = value.trim();
    const missing: string[] = [];

    if (!trimmed) {
      missing.push("Falta ingresar el correo electrónico.");
      return missing;
    }
    if (!trimmed.includes("@")) {
      missing.push("Falta el símbolo '@' (ej: usuario@globalnet.com).");
      return missing;
    }

    const [localPart, ...domainParts] = trimmed.split("@");
    const domainPart = domainParts.join("@");

    if (!localPart) {
      missing.push("Falta el usuario antes de '@'.");
    }
    if (!domainPart || !domainPart.includes(".") || domainPart.startsWith(".") || domainPart.endsWith(".")) {
      missing.push("Falta completar el dominio después de '@' (ej: @globalnet.com).");
    }

    return missing;
  };

  const getPasswordValidationErrors = (value: string): string[] => {
    const missing: string[] = [];

    if (!value) {
      missing.push("Falta ingresar la contraseña.");
      return missing;
    }
    if (value.length < 6) {
      missing.push(`Faltan ${6 - value.length} caracteres (mínimo 6, máximo 20).`);
    }
    if (!ALLOWED_PASSWORD_REGEX.test(value)) {
      missing.push("Solo se permiten letras, números y signos ($!#%&).");
    }

    return missing;
  };

  const emailErrors = emailTouched ? getEmailValidationErrors(loginEmail) : [];
  const passwordErrors = passwordTouched ? getPasswordValidationErrors(loginPassword) : [];

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginEmail(e.target.value);
    setErrorMsg(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setErrorMsg(null);

    if (!ALLOWED_PASSWORD_REGEX.test(rawValue)) {
      const invalidChars = Array.from(rawValue).filter((ch) => !ALLOWED_PASSWORD_REGEX.test(ch));
      const uniqueInvalid = Array.from(new Set(invalidChars)).join(" ");
      setInvalidCharNotice(
        `Carácter no permitido (${uniqueInvalid}). Solo letras, números y $ ! # % &`
      );
      const sanitized = rawValue
        .split("")
        .filter((ch) => ALLOWED_PASSWORD_REGEX.test(ch))
        .join("")
        .slice(0, 20);
      setLoginPassword(sanitized);
      return;
    }

    setInvalidCharNotice(null);
    setLoginPassword(rawValue.slice(0, 20));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    const currentEmailErrors = getEmailValidationErrors(loginEmail);
    const currentPasswordErrors = getPasswordValidationErrors(loginPassword);

    if (currentEmailErrors.length > 0 || currentPasswordErrors.length > 0) {
      setErrorMsg("Completa los requisitos indicados en los campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(loginEmail.trim(), loginPassword);
      if (res.success) {
        try {
          if (rememberMe) {
            localStorage.setItem(
              REMEMBER_STORAGE_KEY,
              JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
            );
          } else {
            localStorage.removeItem(REMEMBER_STORAGE_KEY);
          }
        } catch {
          // ignore
        }
        setSuccessMsg("¡Acceso concedido! Ingresando...");
        window.dispatchEvent(new CustomEvent("assetguard:wave-start"));
        // Cambia la interfaz apenas la ola cubre la pantalla (1.15s) para que ya esté lista sin ninguna pausa
        setTimeout(() => router.replace("/"), 1150);
      } else {
        setErrorMsg(res.error || "Correo o contraseña incorrectos.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendRecoveryEmail = async () => {
    const targetUserEmail = (recoveryEmail || loginEmail).trim().toLowerCase();

    if (targetUserEmail === ADMIN_EMAIL) {
      setRecoverySentMsg(null);
      setErrorMsg("La cuenta de Administrador (Angie Ramos) no utiliza este canal de recuperación.");
      return;
    }

    const emailValidation = getEmailValidationErrors(targetUserEmail);

    if (emailValidation.length > 0) {
      setRecoverySentMsg(null);
      setErrorMsg(emailValidation[0]);
      return;
    }

    setErrorMsg(null);
    const noteText = recoveryNote.trim() || "Solicito restablecimiento de mi contraseña de acceso.";

    try {
      const raw = localStorage.getItem("assetguard_recovery_requests");
      const currentList: Array<{ email: string; note?: string; requestedAt: string; status: string }> = raw
        ? JSON.parse(raw)
        : [];
      const updated = [
        {
          email: targetUserEmail,
          note: noteText,
          requestedAt: new Date().toISOString(),
          status: "PENDING",
        },
        ...currentList.filter((item) => item.email !== targetUserEmail),
      ];
      localStorage.setItem("assetguard_recovery_requests", JSON.stringify(updated));

      await fetch("/api/auth/password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetUserEmail, note: noteText }),
      });
    } catch {
      // Queda registrado en cola local
    }

    const subject = encodeURIComponent(`Recuperación de Contraseña - ${targetUserEmail}`);
    const body = encodeURIComponent(
      `Usuario solicitante: ${targetUserEmail}\nMotivo: ${noteText}\nDestinatario: Administrador del Sistema (Angie Ramos)`
    );
    try {
      window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
    } catch {
      // ignore
    }

    setRecoverySentMsg(
      `¡Solicitud enviada exitosamente! Se ha enviado el correo a Angie Ramos (Administrador) para restablecer la contraseña de ${targetUserEmail}.`
    );
  };

  const handleCopyAdminEmail = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
      setCopiedAdminEmail(true);
      setTimeout(() => setCopiedAdminEmail(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#E3EAEE] flex flex-col relative overflow-hidden">
      {/* Main Content: Two columns side by side */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* LEFT COLUMN — Brand / Identity Panel */}
        <div
          className={`md:w-1/2 bg-gradient-to-br from-[#1995AD] via-[#68B2C4] to-[#A1D6E2] flex flex-col items-center justify-center px-8 sm:px-12 py-10 transition-all duration-200 ${
            showRecoveryBox ? "blur-[4px] opacity-70 pointer-events-none select-none" : ""
          }`}
        >
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
                <span className="inline-block whitespace-nowrap">
                  AssetGuard<span className="text-[#172B4D]">_2620</span>
                </span>
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

        {/* RIGHT COLUMN — Wide Login Card (ancho amplio, altura compacta a la mitad) */}
        <div className="md:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-[#DDE6EC]">
          <div className="w-full max-w-2xl bg-white px-8 sm:px-12 py-7 sm:py-9 rounded-3xl border-2 border-[#1995AD]/45 shadow-2xl shadow-[#172B4D]/15 space-y-5">
            {/* Title — Más gordito y centrado */}
            <div
              className={`text-center transition-all duration-200 ${
                showRecoveryBox ? "blur-[4px] opacity-60 pointer-events-none select-none" : ""
              }`}
            >
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

            {/* Global Feedback Banners */}
            {authError && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm text-amber-800 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{authError}</span>
              </div>
            )}
            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-5">
              {/* Campos superiores (se desenfocan cuando se abre el recuadro de recuperación) */}
              <div
                className={`space-y-5 transition-all duration-200 ${
                  showRecoveryBox ? "blur-[4px] opacity-60 pointer-events-none select-none" : ""
                }`}
              >
                {/* EMAIL BOX */}
                <div
                  className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                    emailErrors.length > 0
                      ? "border-red-400 bg-red-50/40"
                      : "border-[#AFC8D0] bg-[#F1F1F2]/80 focus-within:border-[#1995AD] focus-within:bg-white"
                  }`}
                >
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-bold text-[#172B4D] uppercase tracking-wider mb-2"
                  >
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
                      value={loginEmail}
                      onChange={handleEmailChange}
                      onBlur={() => setEmailTouched(true)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#BCBABE]/80 bg-white text-lg text-[#172B4D] placeholder:text-[#BCBABE] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                    />
                  </div>

                  {emailErrors.length > 0 && (
                    <p className="mt-2 text-xs sm:text-sm font-semibold text-red-600">
                      {emailErrors.join(" ")}
                    </p>
                  )}
                </div>

                {/* PASSWORD BOX */}
                <div
                  className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                    passwordErrors.length > 0 || invalidCharNotice
                      ? "border-red-400 bg-red-50/40"
                      : "border-[#AFC8D0] bg-[#F1F1F2]/80 focus-within:border-[#1995AD] focus-within:bg-white"
                  }`}
                >
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-bold text-[#172B4D] uppercase tracking-wider mb-2"
                  >
                    Contraseña
                  </label>

                  <div className="relative">
                    <Lock className="h-5 w-5 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      maxLength={20}
                      placeholder="Letras, números y signos ($!#%&)"
                      value={loginPassword}
                      onChange={handlePasswordChange}
                      onBlur={() => setPasswordTouched(true)}
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-[#BCBABE]/80 bg-white text-lg text-[#172B4D] placeholder:text-[#BCBABE] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD]"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {invalidCharNotice && (
                    <p className="mt-2 text-xs sm:text-sm font-semibold text-amber-700">
                      {invalidCharNotice}
                    </p>
                  )}

                  {passwordErrors.length > 0 && (
                    <p className="mt-2 text-xs sm:text-sm font-semibold text-red-600">
                      {passwordErrors.join(" ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Área debajo de Contraseña: Si está activo "¿Olvidaste tu contraseña?", abarca toda esta zona */}
              {!showRecoveryBox ? (
                <>
                  {/* Options row */}
                  <div className="flex items-center justify-between gap-2 text-sm sm:text-base">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-[#172B4D] font-medium select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setRememberMe(checked);
                          try {
                            if (!checked) {
                              localStorage.removeItem(REMEMBER_STORAGE_KEY);
                            } else if (loginEmail.trim() || loginPassword) {
                              localStorage.setItem(
                                REMEMBER_STORAGE_KEY,
                                JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
                              );
                            }
                          } catch {
                            // ignore
                          }
                        }}
                        className="h-4 w-4 rounded border-[#BCBABE] text-[#1995AD] focus:ring-[#1995AD]"
                      />
                      <span>Recordar sesión</span>
                    </label>

                    {/* Acción "¿Olvidaste tu contraseña?": Solo disponible para Inspector y Técnico (oculta para el Admin) */}
                    {loginEmail.trim().toLowerCase() !== ADMIN_EMAIL ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowRecoveryBox(true);
                          setRecoverySentMsg(null);
                          setRecoveryEmail(loginEmail.trim());
                        }}
                        className="font-bold text-[#1995AD] hover:text-[#172B4D] underline underline-offset-4 cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    ) : (
                      <span className="text-xs text-[#172B4D]/60 italic font-medium">
                        Cuenta Administrador principal
                      </span>
                    )}
                  </div>

                  {/* Submit Button — Solo dice "Ingresar" y más grande */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                    }}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#1995AD] via-[#AFC8D0] to-[#A1D6E2] text-[#172B4D] font-black text-2xl sm:text-3xl tracking-wide hover:opacity-95 disabled:opacity-60 disabled:cursor-wait shadow-md flex items-center justify-center gap-3 transition-all"
                  >
                    <span>{isSubmitting ? "Validando..." : "Ingresar"}</span>
                    <ArrowRight className="h-7 w-7 stroke-[3]" />
                  </button>
                </>
              ) : (
                <div className="relative z-20 rounded-2xl border-2 border-[#1995AD] bg-[#F1F1F2] p-5 space-y-4 shadow-xl">
                  {recoverySentMsg ? (
                    <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-5 space-y-3 text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                      <h4 className="font-title text-xl text-emerald-900">
                        ¡Correo Enviado Exitosamente!
                      </h4>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-800 leading-relaxed max-w-md mx-auto">
                        {recoverySentMsg}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRecoveryBox(false);
                          setRecoverySentMsg(null);
                        }}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-xs cursor-pointer"
                      >
                        Volver a Iniciar Sesión
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm sm:text-base font-bold text-[#172B4D] block">
                            Recuperar Contraseña (Inspector / Técnico)
                          </span>
                          <span className="text-xs text-[#172B4D]/70">
                            Se enviará la solicitud al Administrador (Angie Ramos)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRecoveryBox(false);
                            setRecoverySentMsg(null);
                          }}
                          className="text-xs sm:text-sm font-bold text-[#1995AD] hover:text-[#172B4D] underline cursor-pointer"
                        >
                          Volver
                        </button>
                      </div>

                      {/* Selector rápido de cuenta para Inspector o Técnico */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRecoveryEmail("inspector@globalnet.com")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            recoveryEmail === "inspector@globalnet.com"
                              ? "bg-[#1995AD] text-white"
                              : "bg-white text-[#172B4D] border border-[#AFC8D0] hover:bg-[#A1D6E2]/30"
                          }`}
                        >
                          Inspector (Ian Sanchez)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecoveryEmail("technician@globalnet.com")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            recoveryEmail === "technician@globalnet.com"
                              ? "bg-[#1995AD] text-white"
                              : "bg-white text-[#172B4D] border border-[#AFC8D0] hover:bg-[#A1D6E2]/30"
                          }`}
                        >
                          Técnico (Brayan Cuta)
                        </button>
                      </div>

                      <input
                        type="email"
                        placeholder="Confirma tu correo (ej: usuario@globalnet.com)"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#BCBABE] bg-white text-sm sm:text-base text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                      />

                      <input
                        type="text"
                        placeholder="Mensaje para el Administrador (opcional)"
                        value={recoveryNote}
                        onChange={(e) => setRecoveryNote(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#BCBABE] bg-white text-sm sm:text-base text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                      />

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSendRecoveryEmail}
                          className="flex-1 py-3 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-base inline-flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                          <span>Enviar correo al Admin</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </form>

            {/* Minimal Admin Contact Footer (solo visible cuando no está abierto el panel de recuperación) */}
            {!showRecoveryBox && (
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
                    <a
                      href={`mailto:${ADMIN_EMAIL}`}
                      className="font-bold text-[#172B4D] hover:text-[#1995AD]"
                    >
                      {ADMIN_EMAIL}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyAdminEmail}
                      className="text-xs font-bold text-[#1995AD] hover:text-[#172B4D] inline-flex items-center gap-1"
                    >
                      {copiedAdminEmail ? (
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
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className={`bg-[#1995AD] text-white py-3 px-6 text-center text-xs transition-all duration-200 ${
          showRecoveryBox ? "blur-[4px] opacity-70 pointer-events-none select-none" : ""
        }`}
      >
        <p className="font-semibold text-white/90">AssetGuard_2620 - GlobalNet Telecom</p>
      </footer>
    </div>
  );
}
