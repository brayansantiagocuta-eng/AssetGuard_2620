"use client";

import React from "react";
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
} from "lucide-react";

export default function HomePage() {
  const { user, role } = useAuth();
  const { data } = useQuery<any>(GET_FINANCIAL_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
  });

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
      ? "Administrador"
      : role === "INSPECTOR"
      ? "Inspector"
      : role === "TECHNICIAN"
      ? "Técnico"
      : "";

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Cabecera Estándar Unificada */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#AFC8D0]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 flex items-center justify-center text-[#1995AD] shrink-0 shadow-xs">
            <Layers className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-title text-3xl sm:text-4xl text-[#172B4D] tracking-tight">
              Panel Principal
            </h1>
            <p className="text-sm text-[#172B4D]/70 mt-0.5">
              Resumen operativo, indicadores financieros y estado de la flota de telecomunicaciones
            </p>
          </div>
        </div>
      </div>

      {/* Saludo institucional con el rol integrado */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1995AD] via-[#188299] to-[#172B4D] text-white p-7 sm:p-8 shadow-md">
        <h2 className="font-title text-2xl sm:text-3xl tracking-tight">
          Hola, {user?.fullName || "Usuario"}{" "}
          {roleLabel && (
            <span className="text-[#A1D6E2] font-normal text-xl sm:text-2xl">
              — {roleLabel}
            </span>
          )}
        </h2>
      </div>

      {/* Los 4 Indicadores Principales con breve descripción de la actividad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#1995AD]/15 flex items-center justify-center text-[#1995AD] shrink-0">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Equipos</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">{totalAssets}</p>
            <p className="text-xs text-[#1995AD] font-semibold mt-0.5">
              Activos registrados en bodega
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <ArrowLeftRight className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">En Préstamo</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">8</p>
            <p className="text-xs text-amber-700 font-semibold mt-0.5">
              Custodias activas en terreno
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Alertas</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">{overdueCount}</p>
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              Equipos por calibrar o vencidos
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#AFC8D0]/60 shadow-xs flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#A1D6E2]/35 flex items-center justify-center text-[#172B4D] shrink-0">
            <Cpu className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#172B4D]/60 uppercase">Valor Total</p>
            <p className="text-3xl font-extrabold text-[#172B4D] leading-tight">{totalValue}</p>
            <p className="text-xs text-[#172B4D]/70 font-semibold mt-0.5">
              Capital total en inventario
            </p>
          </div>
        </div>
      </div>

      {/* Resumen de los 4 Indicadores (en lugar de repetir los enlaces de las interfaces) */}
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
                <p className="text-xs text-[#172B4D]/65">Mateo Silva</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5" /> Pendiente PIN
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F1F2]/70">
              <div>
                <p className="font-bold text-[#172B4D]">EXFO MaxTester 730C OTDR</p>
                <p className="text-xs text-[#172B4D]/65">Mateo Silva</p>
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
                <p className="text-xs text-red-700">ANAL-VIAVI-ONX-003</p>
              </div>
              <span className="text-xs font-extrabold text-red-700">Límite (495/500)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100">
              <div>
                <p className="font-bold text-[#172B4D]">EXFO MaxTester 730C OTDR</p>
                <p className="text-xs text-amber-800">OTDR-MAX-730C-002</p>
              </div>
              <span className="text-xs font-extrabold text-amber-800">Próximo (340/500)</span>
            </div>
          </div>
        </div>

        {/* 4. Resumen de Valor Total */}
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
    </div>
  );
}
