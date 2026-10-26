"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/context/AuthContext";

const ROLE_ALLOWED_ROUTES: Record<string, UserRole[]> = {
  "/users": ["ADMIN"],
  "/audit": ["ADMIN"],
  "/scanner": ["ADMIN", "INSPECTOR"],
  "/inventory": ["ADMIN", "INSPECTOR", "TECHNICIAN"],
  "/loans": ["ADMIN", "INSPECTOR", "TECHNICIAN"],
  "/": ["ADMIN", "INSPECTOR", "TECHNICIAN"],
};

export function AuthNavigationGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading, refreshSession } = useAuth();
  const [isCheckingHistory, setIsCheckingHistory] = useState(false);
  const [wavePhase, setWavePhase] = useState<"idle" | "ready" | "in" | "hold" | "out">("idle");

  // Precargar rutas principales para que el cambio de interfaz detrás de la ola sea instantáneo
  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/login");
  }, [router]);

  // Escuchar el evento de transición de ola (sin pausas muertas al inicio ni al final)
  useEffect(() => {
    const handleWaveStart = () => {
      setWavePhase("ready");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWavePhase("in");
        });
      });

      // A los 1.6s la ola llega exactamente al borde derecho cubriendo el 100% de la pantalla
      setTimeout(() => {
        setWavePhase("hold");
      }, 1600);

      // A los 2.4s (con la nueva interfaz ya cambiada por debajo), se regresa sin pausa muerta
      setTimeout(() => {
        setWavePhase("out");
      }, 2400);

      // A los 4.05s termina de salir y se oculta por completo
      setTimeout(() => {
        setWavePhase("idle");
      }, 4050);
    };

    window.addEventListener("assetguard:wave-start", handleWaveStart);
    return () => {
      window.removeEventListener("assetguard:wave-start", handleWaveStart);
    };
  }, []);

  useEffect(() => {
    if (isLoading || wavePhase !== "idle") {
      return;
    }
    if (pathname !== "/login" && !user) {
      router.replace("/login");
      return;
    }
    // Validación de permisos por Rol (HU-002 Condición 03)
    if (user && role && pathname !== "/login") {
      const matchedPrefix = Object.keys(ROLE_ALLOWED_ROUTES)
        .filter((route) => route !== "/")
        .find((route) => pathname === route || pathname.startsWith(`${route}/`));

      if (matchedPrefix) {
        const allowedRoles = ROLE_ALLOWED_ROUTES[matchedPrefix];
        if (allowedRoles && !allowedRoles.includes(role)) {
          router.replace("/");
        }
      }
    }
  }, [isLoading, pathname, role, router, user, wavePhase]);

  useEffect(() => {
    const validateRestoredPage = () => {
      setIsCheckingHistory(true);
      void refreshSession().then((isAuthenticated) => {
        if (!isAuthenticated) {
          setIsCheckingHistory(false);
          router.replace("/login");
          return;
        }
        setIsCheckingHistory(false);
      });
    };

    window.addEventListener("pageshow", validateRestoredPage);
    window.addEventListener("popstate", validateRestoredPage);
    return () => {
      window.removeEventListener("pageshow", validateRestoredPage);
      window.removeEventListener("popstate", validateRestoredPage);
    };
  }, [refreshSession, router]);

  const isWaveCovered = wavePhase === "in" || wavePhase === "hold";

  return (
    <>
      {/*
        Ancho exacto: 135vw (100vw cuerpo + 35vw crestas de ola).
        En reposo usa -translate-x-full (-135vw), por lo que la punta de la ola está exactamente en 0vw:
        entra en el milisegundo 0 sin pausa inicial, y al regresar en translate-x-0 las crestas están en 100vw
        por lo que se devuelven en el milisegundo 0 sin pausa final.
      */}
      <div
        aria-hidden="true"
        className={`fixed inset-y-0 left-0 z-[100] pointer-events-none w-[135vw] h-screen transition-transform duration-[1600ms] ease-in-out will-change-transform ${
          wavePhase === "idle" ? "invisible opacity-0 -translate-x-full" : "visible opacity-100"
        } ${isWaveCovered ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Capa 3 (Punta exterior de la ola: llega hasta x=1340 de 1350) */}
        <svg
          viewBox="0 0 1350 1200"
          preserveAspectRatio="none"
          className="absolute -top-[25vh] left-0 w-full h-[175vh] animate-wave-layer-3"
        >
          <defs>
            <linearGradient id="fullWaveGradOuter" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1995AD" />
              <stop offset="35%" stopColor="#AFC8D0" />
              <stop offset="72%" stopColor="#A1D6E2" />
              <stop offset="100%" stopColor="#A1D6E2" />
            </linearGradient>
          </defs>
          <path
            d="M-100,0 L1210,0 C1350,140 1090,310 1320,480 C1360,640 1110,820 1330,990 C1350,1100 1150,1200 1260,1200 L-100,1200 Z"
            fill="url(#fullWaveGradOuter)"
            opacity="0.92"
          />
        </svg>

        {/* Capa 2 (Franja intermedia con degradado marcado de los 3 colores: #1995AD -> #AFC8D0 -> #A1D6E2) */}
        <svg
          viewBox="0 0 1350 1200"
          preserveAspectRatio="none"
          className="absolute -top-[20vh] left-0 w-full h-[175vh] animate-wave-layer-2"
        >
          <defs>
            <linearGradient id="fullWaveGradMid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1995AD" />
              <stop offset="30%" stopColor="#68B2C4" />
              <stop offset="65%" stopColor="#AFC8D0" />
              <stop offset="100%" stopColor="#A1D6E2" />
            </linearGradient>
          </defs>
          <path
            d="M-100,0 L1110,0 C1260,160 1020,340 1220,520 C1290,680 1030,860 1230,1030 C1270,1120 1060,1200 1160,1200 L-100,1200 Z"
            fill="url(#fullWaveGradMid)"
            opacity="0.96"
          />
        </svg>

        {/* Capa 1 (Cuerpo opaco: valles en x>=1010 cubren el 100% de la pantalla 100vw, crestas en x=1140) */}
        <svg
          viewBox="0 0 1350 1200"
          preserveAspectRatio="none"
          className="absolute -top-[15vh] left-0 w-full h-[175vh] animate-wave-layer-1"
        >
          <defs>
            <linearGradient id="fullWaveGradInner" x1="0%" y1="0%" x2="88%" y2="15%">
              <stop offset="0%" stopColor="#1995AD" />
              <stop offset="30%" stopColor="#1995AD" />
              <stop offset="68%" stopColor="#AFC8D0" />
              <stop offset="100%" stopColor="#A1D6E2" />
            </linearGradient>
          </defs>
          <path
            d="M-100,0 L1020,0 C1150,180 995,370 1130,560 C1180,720 1000,900 1140,1070 C1170,1140 1010,1200 1080,1200 L-100,1200 Z"
            fill="url(#fullWaveGradInner)"
          />
        </svg>

        {/* Contenido central (Logo y Nombre del Sistema llamativos centrados en los primeros 100vw) */}
        <div className="absolute inset-y-0 left-0 w-[100vw] h-screen flex flex-col items-center justify-center z-20 pointer-events-none px-4">
          <div className="absolute h-[540px] w-[540px] rounded-full bg-[#A1D6E2]/30 blur-3xl pointer-events-none" />

          <div
            className={`relative z-10 flex flex-col items-center gap-3 sm:gap-4 md:gap-5 px-4 max-w-[95vw] text-center transition-all duration-500 ${
              isWaveCovered
                ? "opacity-100 scale-100 translate-x-0"
                : "opacity-0 scale-95 -translate-x-8"
            }`}
          >
            {/* Logo limpio y transparente sin ningún recuadro */}
            <Image
              src="/logo.png"
              alt="AssetGuard_2620 Logo"
              width={380}
              height={250}
              className="h-auto w-[200px] min-[420px]:w-[250px] sm:w-[320px] md:w-[360px] max-w-[85vw] object-contain drop-shadow-[0_12px_24px_rgba(23,43,77,0.45)]"
              priority
              unoptimized
            />

            {/* Textos protegidos contra separación al disminuir la pantalla */}
            <div className="flex flex-col items-center space-y-1 sm:space-y-2">
              <h1 className="font-title text-[clamp(1.85rem,6vw,4.75rem)] text-white tracking-tight leading-none drop-shadow-[0_6px_20px_rgba(23,43,77,0.55)] whitespace-nowrap select-none">
                <span className="inline-block whitespace-nowrap">
                  AssetGuard<span className="text-[#172B4D]">_2620</span>
                </span>
              </h1>

              <p className="font-title text-[clamp(1rem,2.8vw,1.85rem)] text-[#172B4D] tracking-widest uppercase drop-shadow-sm whitespace-nowrap select-none">
                GlobalNet Telecom
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading || isCheckingHistory || (pathname !== "/login" && !user && wavePhase === "idle") ? (
        <div
          className="flex min-h-screen items-center justify-center text-sm text-slate-600"
          role="status"
        >
          Verificando la sesión...
        </div>
      ) : (
        children
      )}
    </>
  );
}
