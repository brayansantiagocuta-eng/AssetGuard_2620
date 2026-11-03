"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/context/AuthContext";
import { GET_FINANCIAL_SUMMARY_QUERY } from "@/lib/graphql/queries";
import {
  Layers,
  Package,
  ArrowLeftRight,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  Clock,
  KeyRound,
  QrCode,
  ShieldCheck,
  Send,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";

export default function HomePage() {
  const { user, role } = useAuth();
  const { data } = useQuery<any>(GET_FINANCIAL_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  // Modal contextual explicativo para el Administrador al pulsar las funciones
  const [contextModal, setContextModal] = useState<{
    title: string;
    desc: string;
    link: string;
    linkText: string;
  } | null>(null);

  const [localLoans, setLocalLoans] = useState<any[]>([]);
  const [adminNotices, setAdminNotices] = useState<Array<{ id: string; message: string; createdAt: string }>>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("assetguard_local_loans");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setLocalLoans(parsed);
        }
      } catch {}

      try {
        const savedNotices = localStorage.getItem("assetguard_admin_notifications");
        if (savedNotices) {
          const parsed = JSON.parse(savedNotices);
          if (Array.isArray(parsed)) setAdminNotices(parsed);
        }
      } catch {}
    }
  }, []);

  const dismissAdminNotice = (id: string) => {
    const updated = adminNotices.filter((n) => n.id !== id);
    setAdminNotices(updated);
    try {
      localStorage.setItem("assetguard_admin_notifications", JSON.stringify(updated));
    } catch {}
  };

  const summary = data?.financialSummary;
  const totalAssets = summary?.totalAssetsCount ?? 48;
  const overdueCount = summary?.overdueAssetsCount ?? 2;
  const totalValue = summary?.totalAcquisitionValue
    ? `$${Number(summary.totalAcquisitionValue).toLocaleString("en-US")}`
    : "$142,500";
  const currentBookValue = summary?.currentDepreciatedValue
    ? `$${Number(summary.currentDepreciatedValue).toLocaleString("en-US")}`
    : "$118,400";
  const valueAtRisk = summary?.totalValueAtRisk
    ? `$${Number(summary.totalValueAtRisk).toLocaleString("en-US")}`
    : "$21,200";

  const roleLabel =
    role === "ADMIN"
      ? "Administradora"
      : role === "INSPECTOR"
      ? "Inspector de Bodega"
      : role === "TECHNICIAN"
      ? "Técnico Especialista de Campo"
      : "Usuario";

  // ==========================================
  // VISTA 1: TÉCNICO DE CAMPO (HU Técnicas)
  // ==========================================
  if (role === "TECHNICIAN") {
    const myLoans = localLoans.filter(
      (l) =>
        !user?.fullName ||
        l.technicianName?.toLowerCase() === user.fullName.toLowerCase() ||
        l.technicianName?.toLowerCase() === "brayan cuta"
    );

    const activeCount = myLoans.filter((l) => l.status === "ACTIVE").length || 1;
    const approvedCount = myLoans.filter((l) => l.status === "APPROVED").length || 1;

    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Saludo Personalizado */}
        <div className="rounded-3xl bg-gradient-to-r from-[#1995AD] via-[#188299] to-[#172B4D] text-white p-7 sm:p-8 shadow-md">
          <h2 className="font-title text-2xl sm:text-3xl tracking-tight">
            Hola, {user?.fullName || "Brayan Cuta"}
          </h2>
        </div>

        {/* 4 KPIs de Alto Valor para el Técnico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1995AD]/15 flex items-center justify-center text-[#1995AD] shrink-0">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">En Mi Custodia</p>
              <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">{activeCount}</p>
              <p className="text-xs text-[#1995AD] font-semibold mt-0.5">Equipos activos en terreno</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <KeyRound className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Por Retirar (PIN)</p>
              <p className="text-3xl font-extrabold text-amber-600 leading-tight">{approvedCount}</p>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">Listos para validar OTP</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Disponibles</p>
              <p className="text-3xl font-extrabold text-emerald-700 leading-tight">36</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">Aptos en bodega central</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Próximo Retorno</p>
              <p className="text-2xl font-extrabold text-red-600 leading-tight">28 Oct</p>
              <p className="text-xs text-red-600 font-semibold mt-0.5">Evita incurrir en mora</p>
            </div>
          </div>
        </div>

        {/* 2 Bloques Operativos Principales del Técnico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bloque 1: Mis Préstamos Actuales */}
          <div className="bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight className="h-5 w-5 text-[#1995AD]" />
                <h3 className="font-title text-xl text-[#172B4D]">Mis Préstamos Actuales</h3>
              </div>
              <Link href="/loans" className="text-xs font-bold text-[#1995AD] hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#AFC8D0]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-title font-bold text-[#172B4D] text-sm">Fusionadora de Fibra Fujikura 90S+</p>
                  <p className="text-xs text-[#172B4D]/65">Serial: FUS-90S-001 &bull; Retorno: 28 Oct 2026</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full mt-1.5">
                    <KeyRound className="h-3 w-3" /> Aprobado — PIN OTP: 481923
                  </span>
                </div>
                <Link
                  href="/loans"
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors self-start sm:self-auto"
                >
                  Ver PIN en Bodega
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#AFC8D0]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-title font-bold text-[#172B4D] text-sm">Reflectómetro Óptico EXFO 730C</p>
                  <p className="text-xs text-[#172B4D]/65">Serial: OTDR-730C-002 &bull; Retorno: 27 Oct 2026</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full mt-1.5">
                    <CheckCircle2 className="h-3 w-3" /> En Custodia de Campo
                  </span>
                </div>
                <Link
                  href="/inventory"
                  className="px-3.5 py-2 rounded-xl bg-[#172B4D] hover:bg-[#1995AD] text-white font-bold text-xs shadow-xs transition-colors self-start sm:self-auto"
                >
                  Ver Ficha Técnica
                </Link>
              </div>
            </div>
          </div>

          {/* Bloque 2: Equipos Disponibles en Bodega (Sin mostrar equipos en taller) */}
          <div className="bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <div className="flex items-center gap-2.5">
                <Package className="h-5 w-5 text-emerald-600" />
                <h3 className="font-title text-xl text-[#172B4D]">Equipos Disponibles para Solicitar</h3>
              </div>
              <Link href="/inventory" className="text-xs font-bold text-[#1995AD] hover:underline flex items-center gap-1">
                Ver catálogo <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between gap-3">
                <div>
                  <p className="font-title font-bold text-[#172B4D] text-sm">Fujikura 70S Core Fusion Splicer</p>
                  <p className="text-xs text-emerald-800">Serial: FS-70S-99201 &bull; Bodega Principal A1</p>
                  <span className="text-[11px] text-[#172B4D]/70 block mt-0.5">Calibración vigente &bull; 45 / 500 ciclos</span>
                </div>
                <Link
                  href="/loans"
                  className="px-3.5 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                >
                  Solicitar
                </Link>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between gap-3">
                <div>
                  <p className="font-title font-bold text-[#172B4D] text-sm">Fluke DSX-8000 CableAnalyzer Cat 8</p>
                  <p className="text-xs text-emerald-800">Serial: NC-DSX8000-551 &bull; Sucursal Medellín</p>
                  <span className="text-[11px] text-[#172B4D]/70 block mt-0.5">Calibración vigente &bull; 28 / 400 ciclos</span>
                </div>
                <Link
                  href="/loans"
                  className="px-3.5 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                >
                  Solicitar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: INSPECTOR DE BODEGA / CALIBRACIÓN
  // ==========================================
  if (role === "INSPECTOR") {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Saludo Personalizado */}
        <div className="rounded-3xl bg-gradient-to-r from-[#172B4D] via-[#145a6b] to-[#1995AD] text-white p-7 sm:p-8 shadow-md">
          <h2 className="font-title text-2xl sm:text-3xl tracking-tight">
            Hola, {user?.fullName || "Ian Sanchez"}
          </h2>
        </div>

        {/* 4 KPIs de Alto Valor para el Inspector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <KeyRound className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Pendientes OTP</p>
              <p className="text-3xl font-extrabold text-amber-600 leading-tight">1</p>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">Esperando PIN en bodega</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Calibraciones</p>
              <p className="text-3xl font-extrabold text-red-600 leading-tight">2</p>
              <p className="text-xs text-red-600 font-semibold mt-0.5">Vencidas o en límite</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Aptos en Bodega</p>
              <p className="text-3xl font-extrabold text-emerald-700 leading-tight">36</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">Listos para asignación</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1995AD]/15 flex items-center justify-center text-[#1995AD] shrink-0">
              <ArrowLeftRight className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172B4D]/60 uppercase">En Terreno</p>
              <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">8</p>
              <p className="text-xs text-[#1995AD] font-semibold mt-0.5">En custodia operativa</p>
            </div>
          </div>
        </div>

        {/* 2 Secciones Operativas del Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bloque 1: Entregas pendientes de validación PIN */}
          <div className="bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-5 w-5 text-amber-600" />
                <h3 className="font-title text-xl text-[#172B4D]">Entregas Físicas Pendientes de PIN</h3>
              </div>
              <Link href="/loans" className="text-xs font-bold text-[#1995AD] hover:underline flex items-center gap-1">
                Gestionar <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-title font-bold text-[#172B4D] text-sm">Fusionadora de Fibra Fujikura 90S+</p>
                <p className="text-xs text-amber-900 font-semibold mt-0.5">Solicitante: Brayan Cuta &bull; PIN OTP: 481923</p>
                <span className="text-[11px] text-[#172B4D]/70 block mt-0.5">Falta verificación física del equipo antes de salida</span>
              </div>
              <Link
                href="/loans"
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
              >
                Validar PIN
              </Link>
            </div>
          </div>

          {/* Bloque 2: Alertas de Calibración e Inspección */}
          <div className="bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-title text-xl text-[#172B4D]">Equipos por Calibrar o en Límite</h3>
              </div>
              <Link href="/audit" className="text-xs font-bold text-[#1995AD] hover:underline flex items-center gap-1">
                Ver bitácora <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#172B4D]">Viavi OneExpert ONX-580</p>
                  <p className="text-red-700">Serial: ANAL-ONX580-003 &bull; Límite de Ciclos (495/500)</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-extrabold text-[11px]">
                  En Taller
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#172B4D]">EXFO MaxTester 730C OTDR</p>
                  <p className="text-amber-800">Serial: OTDR-730C-002 &bull; Próximo a Mantenimiento (340/500)</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px]">
                  En Terreno
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 3: ADMINISTRADORA (Control Global con Contexto al Clic)
  // ==========================================
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Notificaciones simples de cambio de contraseña para el Administrador */}
      {adminNotices.length > 0 && (
        <div className="space-y-2.5">
          {adminNotices.map((notice) => (
            <div
              key={notice.id}
              className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 text-sm text-[#172B4D]">
                <KeyRound className="h-5 w-5 text-amber-600 shrink-0" />
                <span>
                  <strong>Notificación:</strong> {notice.message}{" "}
                  <span className="text-xs text-[#172B4D]/60">({notice.createdAt})</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissAdminNotice(notice.id)}
                className="text-xs font-bold text-[#172B4D]/70 hover:text-[#172B4D] px-2.5 py-1 rounded-lg hover:bg-amber-200/50 transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Saludo institucional con rol */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1995AD] via-[#188299] to-[#172B4D] text-white p-7 sm:p-8 shadow-md">
        <h2 className="font-title text-2xl sm:text-3xl tracking-tight">
          Hola, {user?.fullName || "Angie Ramos"}
        </h2>
      </div>

      {/* Los 4 Indicadores Clave del Administrador: Interactivos y con Contexto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Equipos */}
        <div
          onClick={() =>
            setContextModal({
              title: "Gestión de Activos en Inventario",
              desc: "Monitoreo integral de la flota de telecomunicaciones de GlobalNet. Permite registrar nuevos equipos, calcular su depreciación contable en línea recta, inspeccionar certificados de calibración y generar etiquetas industriales con código QR oficial.",
              link: "/inventory",
              linkText: "Abrir Inventario Completo",
            })
          }
          className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#1995AD] hover:shadow-md transition-all group"
        >
          <div className="h-14 w-14 rounded-2xl bg-[#1995AD]/15 flex items-center justify-center text-[#1995AD] shrink-0 group-hover:scale-105 transition-transform">
            <Package className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Equipos</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">{totalAssets}</p>
            <p className="text-xs text-[#1995AD] font-semibold mt-0.5 flex items-center gap-1">
              Ver contexto <ChevronRight className="h-3 w-3" />
            </p>
          </div>
        </div>

        {/* KPI 2: En Préstamo */}
        <div
          onClick={() =>
            setContextModal({
              title: "Control de Custodia & Préstamos de Equipos",
              desc: "Supervisión de solicitudes operativas en tiempo real. Garantiza que ningún equipo salga de bodega sin autorización administrativa y validación física obligatoria mediante PIN de seguridad OTP de 6 dígitos con vigencia temporal de 5 minutos.",
              link: "/loans",
              linkText: "Gestionar Préstamos & Códigos OTP",
            })
          }
          className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
            <ArrowLeftRight className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">En Préstamo</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">8</p>
            <p className="text-xs text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
              Ver contexto <ChevronRight className="h-3 w-3" />
            </p>
          </div>
        </div>

        {/* KPI 3: Alertas */}
        <div
          onClick={() =>
            setContextModal({
              title: "Monitoreo de Alertas & Robot CRON",
              desc: "Supervisión preventiva continua. El sistema alerta automáticamente cuando un equipo supera el 95% de sus ciclos máximos de uso o supera 180 días sin calibración. A medianoche, el Robot CRON verifica préstamos vencidos y los clasifica de inmediato En Mora.",
              link: "/audit",
              linkText: "Revisar Auditoría & Monitoreo",
            })
          }
          className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4 cursor-pointer hover:border-red-400 hover:shadow-md transition-all group"
        >
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Alertas</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">{overdueCount}</p>
            <p className="text-xs text-red-600 font-semibold mt-0.5 flex items-center gap-1">
              Ver contexto <ChevronRight className="h-3 w-3" />
            </p>
          </div>
        </div>

        {/* KPI 4: Valor Total */}
        <div
          onClick={() =>
            setContextModal({
              title: "Valoración Financiera de Capital",
              desc: "Indicadores contables consolidados de toda la flota de telecomunicaciones. Muestra la inversión histórica inicial, la amortización por depreciación acumulada según vida útil y el valor económico actual disponible y en riesgo de mora.",
              link: "/inventory",
              linkText: "Ver Calculadora de Activos",
            })
          }
          className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#172B4D] hover:shadow-md transition-all group"
        >
          <div className="h-14 w-14 rounded-2xl bg-[#A1D6E2]/35 flex items-center justify-center text-[#172B4D] shrink-0 group-hover:scale-105 transition-transform">
            <Cpu className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Valor Total</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">{totalValue}</p>
            <p className="text-xs text-[#172B4D]/70 font-semibold mt-0.5 flex items-center gap-1">
              Ver contexto <ChevronRight className="h-3 w-3" />
            </p>
          </div>
        </div>
      </div>

      {/* Resúmenes Detallados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Resumen de Equipos */}
        <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-[#F1F1F2] pb-3">
            <Package className="h-5 w-5 text-[#1995AD]" />
            <h2 className="font-title text-lg text-[#172B4D]">Resumen de Equipos</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <span className="font-bold text-[#172B4D]">Disponibles en Bodega</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                36 equipos
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <span className="font-bold text-[#172B4D]">En Terreno (Préstamo)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#A1D6E2] text-[#172B4D] font-extrabold text-xs">
                8 equipos
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <span className="font-bold text-[#172B4D]">En Mantenimiento / Taller</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-extrabold text-xs">
                4 equipos
              </span>
            </div>
          </div>
        </div>

        {/* 2. Resumen de Préstamos */}
        <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-[#F1F1F2] pb-3">
            <ArrowLeftRight className="h-5 w-5 text-amber-600" />
            <h2 className="font-title text-lg text-[#172B4D]">Resumen En Préstamo</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <div>
                <p className="font-bold text-[#172B4D]">Fujikura 90S+ Splicer</p>
                <p className="text-xs text-[#172B4D]/65">Brayan Cuta &bull; PIN OTP: 481923</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5" /> Pendiente PIN
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <div>
                <p className="font-bold text-[#172B4D]">EXFO MaxTester 730C OTDR</p>
                <p className="text-xs text-[#172B4D]/65">Brayan Cuta</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#172B4D] bg-[#A1D6E2] px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" /> En Terreno
              </span>
            </div>
          </div>
        </div>

        {/* 3. Resumen de Alertas */}
        <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-[#F1F1F2] pb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-title text-lg text-[#172B4D]">Resumen de Alertas</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/70 border border-red-100">
              <div>
                <p className="font-bold text-[#172B4D]">Viavi OneExpert ONX-580</p>
                <p className="text-xs text-red-700">ANAL-ONX580-003</p>
              </div>
              <span className="text-xs font-extrabold text-red-700">Límite (495/500)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100">
              <div>
                <p className="font-bold text-[#172B4D]">EXFO MaxTester 730C OTDR</p>
                <p className="text-xs text-amber-800">OTDR-730C-002</p>
              </div>
              <span className="text-xs font-extrabold text-amber-800">Próximo (340/500)</span>
            </div>
          </div>
        </div>

        {/* 4. Resumen de Valor */}
        <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-[#F1F1F2] pb-3">
            <Cpu className="h-5 w-5 text-[#1995AD]" />
            <h2 className="font-title text-lg text-[#172B4D]">Resumen de Valor</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <span className="font-bold text-[#172B4D]">Valor de Adquisición</span>
              <span className="font-extrabold text-[#172B4D]">{totalValue}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <span className="font-bold text-[#172B4D]">Valor Actual (Depreciado)</span>
              <span className="font-extrabold text-emerald-700">{currentBookValue}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <span className="font-bold text-[#172B4D]">Valor en Riesgo / Mora</span>
              <span className="font-extrabold text-red-600">{valueAtRisk}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Contextual Explicativo para Administradora */}
      {contextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#1995AD]/40 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center">
                  <Info className="h-5 w-5" />
                </div>
                <h3 className="font-title text-xl text-[#172B4D]">{contextModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setContextModal(null)}
                className="text-[#BCBABE] hover:text-[#172B4D] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-[#172B4D]/80 leading-relaxed">
              {contextModal.desc}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F1F2]">
              <button
                type="button"
                onClick={() => setContextModal(null)}
                className="px-4 py-2.5 rounded-xl border border-[#AFC8D0] text-[#172B4D] font-bold text-sm hover:bg-[#F1F1F2] cursor-pointer"
              >
                Cerrar
              </button>
              <Link
                href={contextModal.link}
                onClick={() => setContextModal(null)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                <span>{contextModal.linkText}</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
