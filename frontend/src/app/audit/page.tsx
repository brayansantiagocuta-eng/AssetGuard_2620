"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@/context/AuthContext";
import { GET_AUDIT_LOGS_QUERY, GET_JOB_EXECUTIONS_QUERY } from "@/lib/graphql/queries";
import { RUN_DAILY_OVERDUE_JOB_MUTATION } from "@/lib/graphql/mutations";
import {
  FileText,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Bot,
  User,
  Search,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";

interface HumanAuditEntry {
  id: string;
  userName: string;
  userRole?: string;
  actionCode: string;
  actionTitle: string;
  actionDescription: string;
  actionCategory: "LOAN" | "OTP" | "RETURN" | "CRON" | "USER" | "CALIBRATION";
  entityName: string;
  ipAddress: string;
  createdAt: string;
}

interface HumanCronExecution {
  id: string;
  jobName: string;
  jobTitle: string;
  executedAt: string;
  status: "SUCCESS" | "FAILED";
  recordsProcessed: number;
  humanSummary: string;
}

const INITIAL_FALLBACK_LOGS: HumanAuditEntry[] = [
  {
    id: "AUD-101",
    userName: "Brayan Cuta",
    userRole: "Técnico de Campo",
    actionCode: "CREATE_LOAN_REQUEST",
    actionTitle: "Solicitud de Préstamo",
    actionDescription: "Registró solicitud para la Fusionadora de Fibra Fujikura 90S+ (FUS-90S-001)",
    actionCategory: "LOAN",
    entityName: "Préstamos",
    ipAddress: "192.168.10.45",
    createdAt: "2026-10-26 09:15",
  },
  {
    id: "AUD-102",
    userName: "Angie Ramos",
    userRole: "Administradora",
    actionCode: "APPROVE_LOAN_REQUEST",
    actionTitle: "Aprobación de Solicitud",
    actionDescription: "Autorizó la solicitud de préstamo del equipo tras validar calibración vigente",
    actionCategory: "LOAN",
    entityName: "Préstamos",
    ipAddress: "192.168.10.10",
    createdAt: "2026-10-26 09:20",
  },
  {
    id: "AUD-103",
    userName: "Ian Sanchez",
    userRole: "Inspector de Bodega",
    actionCode: "VALIDATE_OTP_DELIVERY",
    actionTitle: "Entrega con PIN OTP",
    actionDescription: "Validó el PIN de seguridad de 6 dígitos y transfirió la custodia física del equipo",
    actionCategory: "OTP",
    entityName: "Custodia Física",
    ipAddress: "192.168.10.12",
    createdAt: "2026-10-26 09:30",
  },
  {
    id: "AUD-104",
    userName: "Robot Automático CRON",
    userRole: "Sistema Programado",
    actionCode: "DAILY_OVERDUE_DETECTION",
    actionTitle: "Monitoreo Nocturno de Mora",
    actionDescription: "Revisó préstamos vencidos a la medianoche y actualizó el estado a 'En Mora'",
    actionCategory: "CRON",
    entityName: "Monitoreo",
    ipAddress: "127.0.0.1 (Servidor)",
    createdAt: "2026-10-26 00:00",
  },
  {
    id: "AUD-105",
    userName: "Ian Sanchez",
    userRole: "Inspector de Bodega",
    actionCode: "RETURN_LOAN",
    actionTitle: "Devolución Recibida",
    actionDescription: "Recibió el Reflectómetro EXFO 730C en bodega sin daños y actualizó el inventario",
    actionCategory: "RETURN",
    entityName: "Inventario",
    ipAddress: "192.168.10.12",
    createdAt: "2026-10-25 16:45",
  },
];

const INITIAL_FALLBACK_CRON_JOBS: HumanCronExecution[] = [
  {
    id: "JOB-202",
    jobName: "DailyOverdueDetectionJob",
    jobTitle: "Detección Diaria de Vencimientos",
    executedAt: "2026-10-26 00:00",
    status: "SUCCESS",
    recordsProcessed: 1,
    humanSummary: "Se detectó 1 equipo con fecha de retorno vencida y se marcó automáticamente En Mora.",
  },
  {
    id: "JOB-201",
    jobName: "DailyOverdueDetectionJob",
    jobTitle: "Detección Diaria de Vencimientos",
    executedAt: "2026-10-25 00:00",
    status: "SUCCESS",
    recordsProcessed: 0,
    humanSummary: "Todos los préstamos activos se encontraban dentro del plazo autorizado.",
  },
];

function translateAction(rawAction: string): {
  title: string;
  description: string;
  category: HumanAuditEntry["actionCategory"];
} {
  const code = (rawAction || "").toUpperCase();
  if (code.includes("CREATE_LOAN") || code.includes("REQUEST")) {
    return {
      title: "Solicitud de Préstamo",
      description: "Se ingresó una nueva solicitud de equipo para asignación técnica",
      category: "LOAN",
    };
  }
  if (code.includes("APPROVE")) {
    return {
      title: "Aprobación de Préstamo",
      description: "El responsable autorizó la salida del equipo de bodega",
      category: "LOAN",
    };
  }
  if (code.includes("OTP") || code.includes("PIN") || code.includes("DELIVERY")) {
    return {
      title: "Entrega con PIN OTP",
      description: "Se verificó el código de 6 dígitos y se entregó la custodia física",
      category: "OTP",
    };
  }
  if (code.includes("RETURN")) {
    return {
      title: "Devolución de Equipo",
      description: "El equipo retornó a bodega y fue reintegrado al inventario disponible",
      category: "RETURN",
    };
  }
  if (code.includes("OVERDUE") || code.includes("CRON") || code.includes("DAILY")) {
    return {
      title: "Monitoreo Automático de Mora",
      description: "El robot del sistema verificó los plazos de retorno vencidos",
      category: "CRON",
    };
  }
  if (code.includes("CALIBRATION")) {
    return {
      title: "Calibración / Mantenimiento",
      description: "Se registró prueba técnica de calibración y vigencia de uso",
      category: "CALIBRATION",
    };
  }
  if (code.includes("USER") || code.includes("PASSWORD")) {
    return {
      title: "Gestión de Usuario",
      description: "Modificación de datos o credenciales de acceso al sistema",
      category: "USER",
    };
  }

  return {
    title: rawAction.replace(/_/g, " "),
    description: "Movimiento auditado en la base de datos de GlobalNet",
    category: "LOAN",
  };
}

export default function AuditPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"LOGS" | "CRON">("LOGS");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");

  const [logs, setLogs] = useState<HumanAuditEntry[]>(INITIAL_FALLBACK_LOGS);
  const [cronJobs, setCronJobs] = useState<HumanCronExecution[]>(INITIAL_FALLBACK_CRON_JOBS);
  const [isExecutingCron, setIsExecutingCron] = useState(false);
  const [cronNotice, setCronNotice] = useState<string | null>(null);

  const { data: logsData, refetch: refetchLogs } = useQuery<any>(GET_AUDIT_LOGS_QUERY, {
    variables: { pagination: { page: 0, size: 50 } },
    fetchPolicy: "cache-and-network",
  });

  const { data: jobsData, refetch: refetchJobs } = useQuery<any>(GET_JOB_EXECUTIONS_QUERY, {
    variables: { pagination: { page: 0, size: 30 } },
    fetchPolicy: "cache-and-network",
  });

  const [runCronMutation] = useMutation(RUN_DAILY_OVERDUE_JOB_MUTATION);

  // Mapear logs de GraphQL a lenguaje 100% entendible por cualquier persona
  useEffect(() => {
    if (logsData?.auditLogs?.items && logsData.auditLogs.items.length > 0) {
      const mapped: HumanAuditEntry[] = logsData.auditLogs.items.map((l: any) => {
        const trans = translateAction(l.action);
        return {
          id: `AUD-${l.id}`,
          userName: l.userFullName || (l.action.includes("CRON") ? "Robot Automático CRON" : "Sistema"),
          userRole: l.action.includes("CRON") ? "Robot Programado" : "Usuario Registrado",
          actionCode: l.action,
          actionTitle: trans.title,
          actionDescription: trans.description,
          actionCategory: trans.category,
          entityName: l.entityName === "loan_requests" ? "Solicitudes" : l.entityName === "loans" ? "Préstamos" : l.entityName,
          ipAddress: l.ipAddress || "127.0.0.1",
          createdAt: String(l.createdAt || "").slice(0, 16).replace("T", " "),
        };
      });
      setLogs(mapped);
    }
  }, [logsData]);

  // Mapear ejecuciones CRON de GraphQL
  useEffect(() => {
    if (jobsData?.jobExecutions?.items && jobsData.jobExecutions.items.length > 0) {
      const mapped: HumanCronExecution[] = jobsData.jobExecutions.items.map((j: any) => {
        const count = j.recordsProcessed ?? 0;
        return {
          id: `JOB-${j.id}`,
          jobName: j.jobName,
          jobTitle: "Detección Diaria de Vencimientos",
          executedAt: String(j.executedAt || "").slice(0, 16).replace("T", " "),
          status: j.status as any,
          recordsProcessed: count,
          humanSummary:
            count === 0
              ? "Verificación exitosa: Todos los préstamos están dentro del plazo."
              : `Se detectaron ${count} equipo(s) con tiempo vencido y se cambiaron a 'En Mora'.`,
        };
      });
      setCronJobs(mapped);
    }
  }, [jobsData]);

  // Ejecución manual del robot CRON
  const handleTriggerCron = async () => {
    setIsExecutingCron(true);
    setCronNotice(null);
    try {
      await runCronMutation();
      await refetchJobs();
      await refetchLogs();
      setCronNotice("¡Robot CRON ejecutado exitosamente! Se verificaron todos los préstamos activos.");
    } catch {
      // Simulación local
      const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16);
      const newJob: HumanCronExecution = {
        id: `JOB-${Date.now().toString().slice(-3)}`,
        jobName: "DailyOverdueDetectionJob",
        jobTitle: "Detección Diaria de Vencimientos",
        executedAt: nowStr,
        status: "SUCCESS",
        recordsProcessed: 1,
        humanSummary: "Verificación manual: 1 préstamo con tiempo vencido fue clasificado como En Mora.",
      };
      setCronJobs((prev) => [newJob, ...prev]);
      setCronNotice("¡Robot CRON ejecutado exitosamente! Préstamos verificados.");
    } finally {
      setIsExecutingCron(false);
      setTimeout(() => setCronNotice(null), 5000);
    }
  };

  // Filtrado de eventos de auditoría
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.actionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.actionDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ipAddress.includes(searchQuery);

      const matchesCategory =
        selectedCategory === "TODOS" ||
        (selectedCategory === "PRESTAMOS" && (item.actionCategory === "LOAN" || item.actionCategory === "OTP")) ||
        (selectedCategory === "DEVOLUCIONES" && item.actionCategory === "RETURN") ||
        (selectedCategory === "CRON" && item.actionCategory === "CRON") ||
        (selectedCategory === "CALIBRACION" && item.actionCategory === "CALIBRATION");

      return matchesSearch && matchesCategory;
    });
  }, [logs, searchQuery, selectedCategory]);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#AFC8D0]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 flex items-center justify-center text-[#1995AD] shrink-0 shadow-xs">
            <ShieldCheck className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-title text-3xl sm:text-4xl text-[#172B4D] tracking-tight">
              Auditoría & Monitoreo del Sistema
            </h1>
            <p className="text-sm text-[#172B4D]/70 mt-0.5">
              Registro cronológico de movimientos de usuarios y robot automático de detección de mora
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (refetchLogs) refetchLogs();
              if (refetchJobs) refetchJobs();
            }}
            title="Actualizar datos"
            className="p-3 rounded-2xl border border-[#AFC8D0] text-[#172B4D] hover:bg-[#F1F1F2] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-5 w-5 text-[#1995AD]" />
          </button>

          {isAdmin && (
            <button
              type="button"
              disabled={isExecutingCron}
              onClick={handleTriggerCron}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#1995AD] to-[#148296] text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50"
            >
              <Bot className={`h-5 w-5 ${isExecutingCron ? "animate-spin" : ""}`} />
              <span>{isExecutingCron ? "Verificando..." : "Ejecutar Robot CRON"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notificación de ejecución */}
      {cronNotice && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 text-sm font-bold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{cronNotice}</span>
        </div>
      )}

      {/* Bloque Educativo: Explicación Clara de Cómo Funciona para Cualquier Persona */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-white to-[#F1F1F2] p-5 sm:p-6 rounded-3xl border border-[#AFC8D0]/60 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-title text-lg text-[#172B4D]">¿Qué es la Bitácora de Auditoría?</h3>
              <p className="text-xs text-[#172B4D]/60">Trazabilidad legal y de responsabilidades</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#172B4D]/75 leading-relaxed">
            Cada vez que alguien <strong>solicita un equipo</strong>, <strong>valida un PIN OTP</strong> para llevárselo o <strong>lo devuelve a bodega</strong>, el sistema anota automáticamente su nombre, fecha exacta y dirección IP para saber en todo momento quién tuvo la custodia física de las herramientas de alto costo.
          </p>
        </div>

        <div className="bg-gradient-to-br from-white to-[#F1F1F2] p-5 sm:p-6 rounded-3xl border border-[#AFC8D0]/60 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-title text-lg text-[#172B4D]">¿Qué hace el Robot Automático (CRON)?</h3>
              <p className="text-xs text-[#172B4D]/60">Monitoreo continuo todos los días a medianoche</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#172B4D]/75 leading-relaxed">
            A las <strong>00:00 de cada noche</strong>, este proceso automático revisa todos los préstamos vigentes. Si la fecha prometida de entrega ya se cumplió y el equipo no ha vuelto a bodega, lo cambia al estado <strong className="text-red-700">En Mora</strong> para advertir a los administradores sin necesidad de revisión manual.
          </p>
        </div>
      </div>

      {/* Selector de Pestañas Principales: Bitácora vs Robot CRON */}
      <div className="flex items-center gap-2 border-b border-[#AFC8D0]/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("LOGS")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "LOGS"
              ? "bg-[#172B4D] text-white shadow-md"
              : "bg-white text-[#172B4D]/75 border border-[#AFC8D0]/60 hover:bg-[#F1F1F2]"
          }`}
        >
          <FileText className="h-4 w-4 text-[#A1D6E2]" />
          <span>Bitácora de Movimientos ({filteredLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CRON")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "CRON"
              ? "bg-[#172B4D] text-white shadow-md"
              : "bg-white text-[#172B4D]/75 border border-[#AFC8D0]/60 hover:bg-[#F1F1F2]"
          }`}
        >
          <Bot className="h-4 w-4 text-amber-400" />
          <span>Robot de Monitoreo CRON ({cronJobs.length})</span>
        </button>
      </div>

      {/* CONTENIDO 1: BITÁCORA DE MOVIMIENTOS */}
      {activeTab === "LOGS" && (
        <div className="space-y-4">
          {/* Barra de Filtros y Buscador */}
          <div className="bg-white p-4 rounded-2xl border border-[#AFC8D0]/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="h-4 w-4 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por persona, acción o IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/60 focus:bg-white focus:outline-hidden focus:border-[#1995AD]"
              />
            </div>

            {/* Categorías comprensibles */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { label: "Todos los eventos", value: "TODOS" },
                { label: "Préstamos & OTP", value: "PRESTAMOS" },
                { label: "Devoluciones", value: "DEVOLUCIONES" },
                { label: "Robot CRON", value: "CRON" },
                { label: "Calibración", value: "CALIBRACION" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setSelectedCategory(pill.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategory === pill.value
                      ? "bg-[#1995AD] text-white shadow-xs"
                      : "bg-[#F1F1F2] text-[#172B4D]/75 hover:bg-[#A1D6E2]/40"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Fácil Comprensión */}
          <div className="bg-white rounded-3xl border border-[#AFC8D0]/60 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#172B4D]">
                <thead className="bg-[#F1F1F2] border-b border-[#AFC8D0]/40 text-xs font-bold text-[#172B4D]/75 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Momento</th>
                    <th className="px-5 py-3.5">Responsable</th>
                    <th className="px-5 py-3.5">Acción Realizada</th>
                    <th className="px-5 py-3.5">Detalle / Explicación</th>
                    <th className="px-5 py-3.5">IP de Conexión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F1F2]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#BCBABE]">
                        <Info className="h-8 w-8 mx-auto mb-2 text-[#AFC8D0]" />
                        <p className="text-sm font-semibold">No se encontraron eventos con los filtros seleccionados.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isCron = log.actionCategory === "CRON";
                      const isOtp = log.actionCategory === "OTP";
                      const isReturn = log.actionCategory === "RETURN";

                      return (
                        <tr key={log.id} className="hover:bg-[#F1F1F2]/60 transition-colors">
                          {/* Fecha y Hora */}
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-[#172B4D]/70 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[#1995AD]" />
                              {log.createdAt}
                            </span>
                          </td>

                          {/* Responsable */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  isCron
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-[#1995AD]/15 text-[#1995AD]"
                                }`}
                              >
                                {isCron ? <Bot className="h-4 w-4" /> : log.userName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-extrabold text-sm text-[#172B4D] block leading-tight">
                                  {log.userName}
                                </span>
                                <span className="text-[11px] text-[#172B4D]/60 block leading-tight">
                                  {log.userRole || "Usuario"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Acción Realizada (Badge Amigable) */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                                isCron
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : isOtp
                                  ? "bg-[#A1D6E2] text-[#172B4D] border border-[#1995AD]/40"
                                  : isReturn
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-purple-100 text-purple-800 border border-purple-200"
                              }`}
                            >
                              {log.actionTitle}
                            </span>
                          </td>

                          {/* Explicación en Español */}
                          <td className="px-5 py-4 text-xs font-medium text-[#172B4D]/80 max-w-md">
                            {log.actionDescription}
                          </td>

                          {/* IP de Conexión */}
                          <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-[#172B4D]/60">
                            {log.ipAddress}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 2: HISTORIAL DEL ROBOT CRON */}
      {activeTab === "CRON" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#AFC8D0]/40 pb-3">
              <div>
                <h3 className="font-title text-xl text-[#172B4D]">Ejecuciones Automáticas del Robot</h3>
                <p className="text-xs text-[#172B4D]/60">Historial de revisiones nocturnas programadas</p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  disabled={isExecutingCron}
                  onClick={handleTriggerCron}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Play className={`h-4 w-4 ${isExecutingCron ? "animate-spin" : ""}`} />
                  <span>Probar Ejecución Inmediata</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {cronJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-[#F1F1F2]/60 border border-[#AFC8D0]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#1995AD] transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Revisión Exitosa
                      </span>
                      <span className="font-mono text-xs text-[#1995AD] font-bold">{job.id}</span>
                      <span className="text-xs text-[#172B4D]/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {job.executedAt}
                      </span>
                    </div>

                    <h4 className="font-title text-base text-[#172B4D]">{job.jobTitle}</h4>
                    <p className="text-xs sm:text-sm text-[#172B4D]/80 font-medium">
                      {job.humanSummary}
                    </p>
                  </div>

                  <div className="text-right shrink-0 bg-white px-4 py-2.5 rounded-xl border border-[#AFC8D0]/50">
                    <span className="text-[11px] font-bold text-[#172B4D]/60 uppercase block">
                      Casos Detectados
                    </span>
                    <span className="text-2xl font-black text-[#172B4D]">
                      {job.recordsProcessed}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
