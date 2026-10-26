"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import {
  Layers,
  ClipboardList,
  QrCode,
  FileText,
  LogOut,
  Package,
  Users,
} from "lucide-react";

interface NavSectionItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  accentColor: string;
  spreadColor: string;
  sidebarGradient: string;
  bgTint: string;
}

const NAV_ITEMS: NavSectionItem[] = [
  {
    label: "Inicio",
    href: "/",
    icon: Layers,
    roles: ["ADMIN", "INSPECTOR", "TECHNICIAN"],
    accentColor: "#1995AD",
    spreadColor: "#A1D6E2",
    sidebarGradient: "from-[#1995AD] via-[#1995AD] to-[#172B4D]",
    bgTint: "#EEF5F7",
  },
  {
    label: "Inventario",
    href: "/inventory",
    icon: Package,
    roles: ["ADMIN", "INSPECTOR", "TECHNICIAN"],
    accentColor: "#148296",
    spreadColor: "#7EC8D9",
    sidebarGradient: "from-[#148296] via-[#1995AD] to-[#152947]",
    bgTint: "#EBF4F6",
  },
  {
    label: "Préstamos & OTP",
    href: "/loans",
    icon: ClipboardList,
    roles: ["ADMIN", "INSPECTOR", "TECHNICIAN"],
    accentColor: "#1E7E9E",
    spreadColor: "#93CDE0",
    sidebarGradient: "from-[#1E7E9E] via-[#188BA8] to-[#172B4D]",
    bgTint: "#EDF3F7",
  },
  {
    label: "Escáner QR",
    href: "/scanner",
    icon: QrCode,
    roles: ["ADMIN", "INSPECTOR"],
    accentColor: "#168AAD",
    spreadColor: "#8ED8E8",
    sidebarGradient: "from-[#168AAD] via-[#1995AD] to-[#142845]",
    bgTint: "#EAF5F8",
  },
  {
    label: "Usuarios",
    href: "/users",
    icon: Users,
    roles: ["ADMIN"],
    accentColor: "#1B6B93",
    spreadColor: "#9AC5DE",
    sidebarGradient: "from-[#1B6B93] via-[#1995AD] to-[#172B4D]",
    bgTint: "#ECF1F6",
  },
  {
    label: "Auditoría & CRON",
    href: "/audit",
    icon: FileText,
    roles: ["ADMIN"],
    accentColor: "#186287",
    spreadColor: "#AFC8D0",
    sidebarGradient: "from-[#186287] via-[#1985A1] to-[#162642]",
    bgTint: "#ECEFF3",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Estado para la expansión radial de color al dar clic en una sección
  const [spreadEffect, setSpreadEffect] = useState<{
    id: number;
    x: number;
    y: number;
    color: string;
    accent: string;
  } | null>(null);

  const visibleItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));
  const activeItem =
    visibleItems.find((item) => item.href === pathname) || visibleItems[0] || NAV_ITEMS[0];

  // Mantiene el fondo limpio y pristino en toda la app
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.backgroundColor = "#F1F1F2";
    }
  }, []);

  const handleSectionClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: NavSectionItem
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setSpreadEffect({
      id: Date.now(),
      x: centerX,
      y: centerY,
      color: item.spreadColor,
      accent: item.accentColor,
    });

    // Se desvanece de forma suave y cristalina
    setTimeout(() => {
      setSpreadEffect(null);
    }, 500);
  };

  const handleWaveLogout = async () => {
    setLogoutError(null);
    window.dispatchEvent(new CustomEvent("assetguard:wave-start"));
    setTimeout(async () => {
      await logout();
      router.replace("/login");
    }, 1150);
  };

  // No renderizar la barra lateral en la pantalla de login ni sin sesión
  if (pathname === "/login" || !user) {
    return null;
  }

  return (
    <>
      {/* Efecto de gota de color líquido que se esparce intensamente por toda la pantalla y se desvanece de inmediato */}
      {spreadEffect && (
        <div
          key={spreadEffect.id}
          aria-hidden="true"
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
        >
          <div
            style={{
              left: spreadEffect.x,
              top: spreadEffect.y,
              background: `radial-gradient(circle, ${spreadEffect.accent}55 0%, ${spreadEffect.color}35 38%, ${spreadEffect.accent}15 68%, transparent 100%)`,
              border: `1.5px solid ${spreadEffect.accent}80`,
              boxShadow: `0 0 50px 20px ${spreadEffect.accent}55, inset 0 0 30px ${spreadEffect.color}35`,
            }}
            className="fixed h-20 w-20 rounded-full animate-section-spread"
          />
        </div>
      )}

      <aside
        className={`sticky top-0 left-0 z-40 h-screen w-26 sm:w-28 shrink-0 bg-gradient-to-b ${activeItem.sidebarGradient} text-white shadow-2xl border-r border-white/25 flex flex-col items-center justify-between py-5 select-none transition-colors duration-700`}
      >
        {/* Parte Superior: Logo del Sistema sin recuadro y sin función de clic */}
        <div className="flex flex-col items-center px-2">
          <Image
            src="/logo.png"
            alt="AssetGuard_2620"
            width={96}
            height={96}
            className="h-auto w-[84px] sm:w-[92px] object-contain drop-shadow-md pointer-events-none"
            priority
            unoptimized
          />
        </div>

        {/* Parte Central: Íconos con expansión de color al hacer clic y nombre al pasar el mouse */}
        <nav className="flex flex-col items-center gap-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleSectionClick(e, item)}
                style={
                  isActive
                    ? {
                        color: item.accentColor,
                        boxShadow: `0 8px 20px -4px ${item.spreadColor}85`,
                      }
                    : undefined
                }
                className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 active:scale-95 ${
                  isActive
                    ? "bg-white scale-105 ring-2 ring-[#A1D6E2]"
                    : "text-white/90 hover:bg-white/20 hover:text-white hover:scale-105"
                }`}
              >
                <Icon className="h-7 w-7 stroke-[2.2]" />

                {/* Indicador activo lateral */}
                {isActive && (
                  <span
                    style={{ backgroundColor: item.spreadColor }}
                    className="absolute -left-5 sm:-left-6 h-8 w-2 rounded-r-full shadow-sm transition-colors duration-500"
                  />
                )}

                {/* Nombre del apartado al pasar el mouse */}
                <span
                  style={{ borderColor: item.spreadColor }}
                  className="pointer-events-none absolute left-full ml-3.5 px-3.5 py-2 rounded-xl bg-[#172B4D] text-white font-bold text-sm whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-xl border-2 z-50"
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Parte Inferior: Perfil de Usuario y Cerrar Sesión */}
        <div className="flex flex-col items-center gap-3 pt-3 border-t border-white/25 w-16">
          {/* Avatar del Usuario (informativo, sin redirección al hacer clic) */}
          <div
            style={{ color: activeItem.accentColor }}
            className="group relative flex h-13 w-13 items-center justify-center rounded-full bg-white text-sm font-extrabold shadow-md select-none"
          >
            {user.fullName.substring(0, 2).toUpperCase()}

            {/* Tooltip con Nombre y Rol */}
            <div className="pointer-events-none absolute left-full ml-3.5 px-3.5 py-2 rounded-xl bg-[#172B4D] text-white text-left whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-xl border border-[#A1D6E2]/50 z-50">
              <p className="text-sm font-bold text-white leading-tight">{user.fullName}</p>
              <p className="text-xs text-[#A1D6E2] mt-0.5 font-semibold">
                Rol: {user.role === "ADMIN" ? "Administrador" : user.role === "INSPECTOR" ? "Inspector" : "Técnico"}
              </p>
            </div>
          </div>

          {/* Botón Cerrar Sesión */}
          <button
            type="button"
            onClick={handleWaveLogout}
            className="group relative flex h-13 w-13 items-center justify-center rounded-2xl text-white/90 hover:text-white hover:bg-red-500/85 transition-all cursor-pointer"
          >
            <LogOut className="h-6 w-6 stroke-[2.2]" />

            {/* Nombre al pasar el mouse */}
            <span className="pointer-events-none absolute left-full ml-3.5 px-3.5 py-2 rounded-xl bg-[#172B4D] text-white font-bold text-sm whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-xl border border-[#A1D6E2]/50 z-50">
              Cerrar Sesión
            </span>
          </button>

          {logoutError && (
            <span className="sr-only" role="alert">
              {logoutError}
            </span>
          )}
        </div>
      </aside>
    </>
  );
}
