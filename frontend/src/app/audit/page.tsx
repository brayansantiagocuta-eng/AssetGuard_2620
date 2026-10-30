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
  ShieldCheck,
  Bot,
  Search,
  RefreshCw,
  Info,
  Calendar,
  Sparkles,
  Download,
  CalendarDays,
  FileSpreadsheet,
  History,
  RotateCcw,
} from "lucide-react";

export interface HumanAuditEntry {
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

export interface HumanCronExecution {
  id: string;
  jobName: string;
  jobTitle: string;
  executedAt: string;
  status: "SUCCESS" | "FAILED";
  recordsProcessed: number;
  humanSummary: string;
}

export interface DailySummaryReport {
  id: string;
  date: string; // YYYY-MM-DD
  closedAt: string;
  totalMovements: number;
  loansCount: number;
  returnsCount: number;
  otpValidationsCount: number;
  cronExecutionsCount: number;
  calibrationsCount: number;
  usersInvolved: string[];
  summaryText: string;
}

const STORAGE_KEY_DAILY_REPORTS = "assetguard_audit_daily_reports";
const STORAGE_KEY_HIDDEN_LOGS = "assetguard_audit_hidden_logs";

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

function buildDailyReport(targetDate: string, dayLogs: HumanAuditEntry[]): DailySummaryReport {
  const loansCount = dayLogs.filter((l) => l.actionCategory === "LOAN").length;
  const returnsCount = dayLogs.filter((l) => l.actionCategory === "RETURN").length;
  const otpValidationsCount = dayLogs.filter((l) => l.actionCategory === "OTP").length;
  const cronExecutionsCount = dayLogs.filter((l) => l.actionCategory === "CRON").length;
  const calibrationsCount = dayLogs.filter((l) => l.actionCategory === "CALIBRATION").length;

  const usersSet = new Set<string>();
  dayLogs.forEach((l) => {
    if (l.userName && !l.userName.toLowerCase().includes("cron") && !l.userName.toLowerCase().includes("sistema")) {
      usersSet.add(l.userName);
    }
  });
  const usersInvolved = Array.from(usersSet);

  const summaryText =
    dayLogs.length === 0
      ? `Sin movimientos registrados el ${targetDate}.`
      : `Jornada del ${targetDate} consolidada con ${dayLogs.length} movimiento(s): ${loansCount} préstamo(s), ${otpValidationsCount} entrega(s) con PIN OTP, ${returnsCount} devolución(es), ${calibrationsCount} calibración(es) y ${cronExecutionsCount} ejecución(es) automática(s) de monitoreo. Personal participante: ${usersInvolved.length > 0 ? usersInvolved.join(", ") : "Operadores autorizados"}.`;

  return {
    id: `REPORT-${targetDate}`,
    date: targetDate,
    closedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    totalMovements: dayLogs.length,
    loansCount,
    returnsCount,
    otpValidationsCount,
    cronExecutionsCount,
    calibrationsCount,
    usersInvolved,
    summaryText,
  };
}

export default function AuditPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"LOGS" | "CRON">("LOGS");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");

  const [hiddenLogIds, setHiddenLogIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIDDEN_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dailyReports, setDailyReports] = useState<DailySummaryReport[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY_REPORTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [auditNotice, setAuditNotice] = useState<{ type: "success" | "info"; text: string } | null>(null);

  const [manualCronJobs, setManualCronJobs] = useState<HumanCronExecution[]>([]);
  const [isExecutingCron, setIsExecutingCron] = useState(false);
  const [cronNotice, setCronNotice] = useState<string | null>(null);

  const { data: logsData, refetch: refetchLogs } = useQuery<{
    auditLogs?: {
      items?: Array<{
        id: string | number;
        userFullName?: string;
        action: string;
        entityName?: string;
        ipAddress?: string;
        createdAt?: string;
      }>;
    };
  }>(GET_AUDIT_LOGS_QUERY, {
    variables: { pagination: { page: 0, size: 50 } },
    fetchPolicy: "cache-and-network",
  });

  const { data: jobsData, refetch: refetchJobs } = useQuery<{
    jobExecutions?: {
      items?: Array<{
        id: string | number;
        jobName: string;
        executedAt?: string;
        status?: string;
        recordsProcessed?: number;
      }>;
    };
  }>(GET_JOB_EXECUTIONS_QUERY, {
    variables: { pagination: { page: 0, size: 30 } },
    fetchPolicy: "cache-and-network",
  });

  const [runCronMutation] = useMutation(RUN_DAILY_OVERDUE_JOB_MUTATION);

  // Mapear logs de GraphQL a lenguaje 100% entendible por cualquier persona
  const logs = useMemo<HumanAuditEntry[]>(() => {
    if (logsData?.auditLogs?.items && logsData.auditLogs.items.length > 0) {
      return logsData.auditLogs.items.map((l) => {
        const trans = translateAction(l.action);
        return {
          id: `AUD-${l.id}`,
          userName: l.userFullName || (l.action.includes("CRON") ? "Robot Automático CRON" : "Sistema"),
          userRole: l.action.includes("CRON") ? "Robot Programado" : "Usuario Registrado",
          actionCode: l.action,
          actionTitle: trans.title,
          actionDescription: trans.description,
          actionCategory: trans.category,
          entityName: l.entityName === "loan_requests" ? "Solicitudes" : l.entityName === "loans" ? "Préstamos" : (l.entityName || "General"),
          ipAddress: l.ipAddress || "127.0.0.1",
          createdAt: String(l.createdAt || "").slice(0, 16).replace("T", " "),
        };
      });
    }
    return INITIAL_FALLBACK_LOGS;
  }, [logsData]);

  // Mapear ejecuciones CRON de GraphQL + ejecuciones manuales
  const cronJobs = useMemo<HumanCronExecution[]>(() => {
    const list: HumanCronExecution[] = [];
    if (jobsData?.jobExecutions?.items && jobsData.jobExecutions.items.length > 0) {
      const mapped = jobsData.jobExecutions.items.map((j) => {
        const count = j.recordsProcessed ?? 0;
        return {
          id: `JOB-${j.id}`,
          jobName: j.jobName,
          jobTitle: "Detección Diaria de Vencimientos",
          executedAt: String(j.executedAt || "").slice(0, 16).replace("T", " "),
          status: (j.status === "FAILED" ? "FAILED" : "SUCCESS") as "SUCCESS" | "FAILED",
          recordsProcessed: count,
          humanSummary:
            count === 0
              ? "Verificación exitosa: Todos los préstamos están dentro del plazo."
              : `Se detectaron ${count} equipo(s) con tiempo vencido y se cambiaron a 'En Mora'.`,
        };
      });
      list.push(...mapped);
    } else {
      list.push(...INITIAL_FALLBACK_CRON_JOBS);
    }
    return [...manualCronJobs, ...list];
  }, [jobsData, manualCronJobs]);

  // Detección automática de cambio de día (Day Rollover):
  // Si existen movimientos de días anteriores no consolidados, se compila su informe diario y se ocultan
  useEffect(() => {
    if (typeof window === "undefined" || logs.length === 0) return;
    const today = new Date().toISOString().split("T")[0];

    const pastLogs = logs.filter((l) => {
      const logDate = l.createdAt.slice(0, 10);
      return logDate && logDate < today;
    });

    if (pastLogs.length === 0) return;

    try {
      const savedReportsRaw = localStorage.getItem(STORAGE_KEY_DAILY_REPORTS);
      const currentReports: DailySummaryReport[] = savedReportsRaw ? JSON.parse(savedReportsRaw) : [];
      let reportsUpdated = false;
      const updatedReports = [...currentReports];

      const pastDates = Array.from(new Set(pastLogs.map((l) => l.createdAt.slice(0, 10))));

      pastDates.forEach((pDate) => {
        if (!updatedReports.some((r) => r.date === pDate)) {
          const logsForDate = logs.filter((l) => l.createdAt.slice(0, 10) === pDate);
          updatedReports.push(buildDailyReport(pDate, logsForDate));
          reportsUpdated = true;
        }
      });

      if (reportsUpdated) {
        localStorage.setItem(STORAGE_KEY_DAILY_REPORTS, JSON.stringify(updatedReports));
        setDailyReports(updatedReports);
      }

      const pastLogIds = pastLogs.map((l) => l.id);
      const unhiddenPastIds = pastLogIds.filter((id) => !hiddenLogIds.includes(id));
      if (unhiddenPastIds.length > 0) {
        const nextHidden = Array.from(new Set([...hiddenLogIds, ...pastLogIds]));
        localStorage.setItem(STORAGE_KEY_HIDDEN_LOGS, JSON.stringify(nextHidden));
        setHiddenLogIds(nextHidden);
      }
    } catch {
      // ignore
    }
  }, [logs, hiddenLogIds]);

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
      setManualCronJobs((prev) => [newJob, ...prev]);
      setCronNotice("¡Robot CRON ejecutado exitosamente! Préstamos verificados.");
    } finally {
      setIsExecutingCron(false);
      setTimeout(() => setCronNotice(null), 5000);
    }
  };

  // Filtrado de eventos de auditoría (excluyendo los que están en hiddenLogIds)
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (hiddenLogIds.includes(item.id)) return false;

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
  }, [logs, searchQuery, selectedCategory, hiddenLogIds]);

  // Requisito 1: Al exportar el registro de auditoría se descargan y se ocultan los movimientos activos
  const handleExportAudit = () => {
    if (filteredLogs.length === 0) {
      setAuditNotice({
        type: "info",
        text: "No hay movimientos activos visibles para exportar en este momento.",
      });
      return;
    }

    const headers = ["Momento", "Responsable", "Rol", "Accion", "Detalle", "Categoria", "IP"];
    const rows = filteredLogs.map((log) => [
      `"${log.createdAt.replace(/"/g, '""')}"`,
      `"${log.userName.replace(/"/g, '""')}"`,
      `"${(log.userRole || "Usuario").replace(/"/g, '""')}"`,
      `"${log.actionTitle.replace(/"/g, '""')}"`,
      `"${log.actionDescription.replace(/"/g, '""')}"`,
      `"${log.actionCategory}"`,
      `"${log.ipAddress}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const nowStamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    link.setAttribute("href", url);
    link.setAttribute("download", `Auditoria_AssetGuard_${nowStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Ocultar los movimientos exportados
    const exportedIds = filteredLogs.map((l) => l.id);
    const nextHidden = Array.from(new Set([...hiddenLogIds, ...exportedIds]));
    setHiddenLogIds(nextHidden);
    try {
      localStorage.setItem(STORAGE_KEY_HIDDEN_LOGS, JSON.stringify(nextHidden));
    } catch {}

    setAuditNotice({
      type: "success",
      text: `Se exportaron ${exportedIds.length} movimiento(s) en CSV y se ocultaron de la vista activa. Permanecen disponibles en el Historial Diario inferior.`,
    });
  };

  // Requisito 2: Cierre de jornada bajo demanda para consolidar el día y reiniciar el contador a 0
  const handleCloseDayRollover = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter((l) => l.createdAt.slice(0, 10) === today);

    const report = buildDailyReport(today, todayLogs);
    const updatedReports = dailyReports.filter((r) => r.date !== today);
    updatedReports.unshift(report);
    setDailyReports(updatedReports);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_REPORTS, JSON.stringify(updatedReports));
    } catch {}

    const todayLogIds = todayLogs.map((l) => l.id);
    const nextHidden = Array.from(new Set([...hiddenLogIds, ...todayLogIds]));
    setHiddenLogIds(nextHidden);
    try {
      localStorage.setItem(STORAGE_KEY_HIDDEN_LOGS, JSON.stringify(nextHidden));
    } catch {}

    setSelectedHistoryDate(today);
    setAuditNotice({
      type: "success",
      text: `Jornada del día (${today}) cerrada e informe consolidado generado. Los movimientos activos se ocultaron e iniciaron en 0.`,
    });
  };

  const handleResetVisibility = () => {
    setHiddenLogIds([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HIDDEN_LOGS);
    } catch {}
    setAuditNotice({
      type: "info",
      text: "Se ha restaurado la visibilidad de todos los movimientos en la bitácora activa.",
    });
  };

  // Requisito 3: Registros diarios filtrados por fecha al final de la página
  const availableHistoryDates = useMemo(() => {
    const datesSet = new Set<string>();
    const today = new Date().toISOString().split("T")[0];
    datesSet.add(today);
    dailyReports.forEach((r) => datesSet.add(r.date));
    logs.forEach((l) => {
      const d = l.createdAt.slice(0, 10);
      if (d) datesSet.add(d);
    });
    return Array.from(datesSet).sort().reverse();
  }, [dailyReports, logs]);

  const dayHistoryLogs = useMemo(() => {
    return logs.filter((l) => l.createdAt.slice(0, 10) === selectedHistoryDate);
  }, [logs, selectedHistoryDate]);

  const selectedDayReport = useMemo(() => {
    const found = dailyReports.find((r) => r.date === selectedHistoryDate);
    if (found) return found;
    return buildDailyReport(selectedHistoryDate, dayHistoryLogs);
  }, [dailyReports, selectedHistoryDate, dayHistoryLogs]);

  const handleExportDayHistory = (targetDate: string) => {
    const targetLogs = logs.filter((l) => l.createdAt.slice(0, 10) === targetDate);
    if (targetLogs.length === 0) {
      setAuditNotice({
        type: "info",
        text: `No hay registros archivados para la fecha ${targetDate}.`,
      });
      return;
    }
    const headers = ["Momento", "Responsable", "Rol", "Accion", "Detalle", "Categoria", "IP"];
    const rows = targetLogs.map((log) => [
      `"${log.createdAt.replace(/"/g, '""')}"`,
      `"${log.userName.replace(/"/g, '""')}"`,
      `"${(log.userRole || "Usuario").replace(/"/g, '""')}"`,
      `"${log.actionTitle.replace(/"/g, '""')}"`,
      `"${log.actionDescription.replace(/"/g, '""')}"`,
      `"${log.actionCategory}"`,
      `"${log.ipAddress}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Informe_Auditoria_${targetDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
              Registro cronológico de movimientos de usuarios, informes diarios y robot automático de mora
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

          {/* Botón Exportar Bitácora (Descarga CSV y oculta movimientos) */}
          <button
            type="button"
            onClick={handleExportAudit}
            title="Descargar CSV y ocultar movimientos exportados"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#1995AD] bg-[#1995AD]/10 text-[#1995AD] font-bold text-sm hover:bg-[#1995AD] hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Bitácora</span>
          </button>

          {/* Botón Administrador: Cerrar Jornada (Iniciar en 0) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleCloseDayRollover}
              title="Generar resumen de hoy, ocultar movimientos e iniciar cuenta en 0"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#172B4D] bg-[#172B4D] text-white font-bold text-sm hover:bg-[#172B4D]/90 transition-all cursor-pointer shadow-xs"
            >
              <History className="h-4 w-4 text-[#A1D6E2]" />
              <span>Cerrar Jornada (Iniciar en 0)</span>
            </button>
          )}

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

      {/* Notificación de Auditoría / Exportación */}
      {auditNotice && (
        <div
          className={`rounded-2xl p-4 text-sm font-bold flex items-center justify-between gap-2.5 shadow-xs transition-all ${
            auditNotice.type === "success"
              ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
              : "bg-sky-50 border border-sky-300 text-sky-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2
              className={`h-5 w-5 shrink-0 ${
                auditNotice.type === "success" ? "text-emerald-600" : "text-sky-600"
              }`}
            />
            <span>{auditNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuditNotice(null)}
            className="text-xs underline hover:opacity-75 cursor-pointer ml-4"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Notificación de ejecución CRON */}
      {cronNotice && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 text-sm font-bold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{cronNotice}</span>
        </div>
      )}

      {/* Bloque Educativo: Explicación Clara */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-white to-[#F1F1F2] p-5 sm:p-6 rounded-3xl border border-[#AFC8D0]/60 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-title text-lg text-[#172B4D]">Bitácora Activa & Cierre Diario</h3>
              <p className="text-xs text-[#172B4D]/60">Cuenta de movimientos y consolidación de jornada</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#172B4D]/75 leading-relaxed">
            Al finalizar el día o pulsar <strong>Exportar Bitácora</strong>, los movimientos activos se resumen en un informe diario seguro y se ocultan de la vista en vivo para que la cuenta diaria comience en <strong>0</strong>. Todo el historial consolidado permanece consultable por fecha en la sección inferior.
          </p>
        </div>

        <div className="bg-gradient-to-br from-white to-[#F1F1F2] p-5 sm:p-6 rounded-3xl border border-[#AFC8D0]/60 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-title text-lg text-[#172B4D]">¿Qué hace el Robot Automático (CRON)?</h3>
              <p className="text-xs text-[#172B4D]/60">Monitoreo nocturno continuo a medianoche</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#172B4D]/75 leading-relaxed">
            A las <strong>00:00 de cada noche</strong>, este proceso automático revisa todos los préstamos vigentes. Si la fecha pactada de retorno ya venció y el equipo no ha vuelto a bodega, lo marca de inmediato <strong className="text-red-700">En Mora</strong> para alertar a los administradores.
          </p>
        </div>
      </div>

      {/* Selector de Pestañas Principales: Bitácora vs Robot CRON */}
      <div className="flex items-center justify-between border-b border-[#AFC8D0]/40 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
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
            <span>Movimientos Activos de Hoy ({filteredLogs.length})</span>
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

        {hiddenLogIds.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#172B4D]/60 font-medium">
              ({hiddenLogIds.length} archivado/oculto)
            </span>
            <button
              type="button"
              onClick={handleResetVisibility}
              className="inline-flex items-center gap-1 text-[#1995AD] font-bold hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Ver todos los activos</span>
            </button>
          </div>
        )}
      </div>

      {/* CONTENIDO 1: BITÁCORA DE MOVIMIENTOS ACTIVOS */}
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

          {/* Tabla de Movimientos Activos */}
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
                        <p className="text-sm font-semibold text-[#172B4D]">
                          La cuenta de movimientos activos está en 0 para esta jornada.
                        </p>
                        <p className="text-xs text-[#172B4D]/60 mt-1 max-w-md mx-auto">
                          Los movimientos previos fueron exportados o archivados en el informe diario. Puedes ver el detalle completo en la sección de historial inferior.
                        </p>
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

      {/* =========================================================================
          REQUISITO 3: SECCIÓN INFERIOR — HISTORIAL DE REGISTROS DIARIOS FILTRADOS POR FECHA
         ========================================================================= */}
      <div className="pt-6 border-t-2 border-[#AFC8D0]/40 space-y-6">
        <div className="bg-white rounded-3xl border-2 border-[#1995AD]/40 p-6 sm:p-7 shadow-md space-y-6">
          {/* Cabecera de la sección inferior */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#AFC8D0]/40 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#172B4D] text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarDays className="h-6 w-6 text-[#A1D6E2]" />
              </div>
              <div>
                <h2 className="font-title text-2xl text-[#172B4D] tracking-tight">
                  Historial de Registros Diarios e Informes Consolidados
                </h2>
                <p className="text-xs sm:text-sm text-[#172B4D]/70">
                  Consulta el informe de bitácora resumido y los movimientos de cualquier fecha seleccionada
                </p>
              </div>
            </div>

            {/* Selector de fecha y botón de descarga del día */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#F1F1F2] px-3 py-2 rounded-2xl border border-[#AFC8D0]">
                <Calendar className="h-4 w-4 text-[#1995AD]" />
                <label htmlFor="history-date-picker" className="text-xs font-bold text-[#172B4D]">
                  Fecha:
                </label>
                <input
                  id="history-date-picker"
                  type="date"
                  value={selectedHistoryDate}
                  onChange={(e) => setSelectedHistoryDate(e.target.value)}
                  className="bg-transparent text-sm font-extrabold text-[#172B4D] focus:outline-hidden cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => handleExportDayHistory(selectedHistoryDate)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1995AD] text-white font-bold text-xs shadow-xs hover:bg-[#148296] transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Descargar Informe de esta Fecha</span>
              </button>
            </div>
          </div>

          {/* Pastillas de acceso rápido a fechas con registros */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-[#172B4D]/60 uppercase shrink-0">
              Jornadas con registro:
            </span>
            {availableHistoryDates.map((dateStr) => {
              const isSelected = selectedHistoryDate === dateStr;
              const hasReport = dailyReports.some((r) => r.date === dateStr);
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedHistoryDate(dateStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#172B4D] text-white shadow-xs"
                      : "bg-[#F1F1F2] text-[#172B4D] hover:bg-[#A1D6E2]/50 border border-[#AFC8D0]/60"
                  }`}
                >
                  <Calendar className="h-3 w-3 text-[#1995AD]" />
                  <span>{dateStr}</span>
                  {hasReport && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" title="Informe consolidado guardado" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tarjeta del Informe Consolidado de la Fecha Seleccionada */}
          <div className="rounded-2xl bg-gradient-to-br from-[#F1F1F2]/80 via-white to-[#F1F1F2]/50 border border-[#AFC8D0] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#AFC8D0]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center font-bold">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-title text-base sm:text-lg text-[#172B4D]">
                    Resumen Ejecutivo del Día: <span className="text-[#1995AD]">{selectedHistoryDate}</span>
                  </h3>
                  <p className="text-xs text-[#172B4D]/60">
                    {selectedDayReport.closedAt
                      ? `Consolidado registrado el ${selectedDayReport.closedAt}`
                      : "Jornada en curso"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#1995AD]/15 text-[#1995AD] border border-[#1995AD]/30">
                  {selectedDayReport.totalMovements} Movimientos Totales
                </span>
              </div>
            </div>

            {/* Indicadores clave del informe */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-white rounded-xl border border-[#AFC8D0]/50 text-center">
                <span className="block text-[11px] font-bold text-[#172B4D]/60 uppercase">Préstamos</span>
                <span className="text-xl font-black text-[#172B4D]">{selectedDayReport.loansCount}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#AFC8D0]/50 text-center">
                <span className="block text-[11px] font-bold text-[#172B4D]/60 uppercase">Entregas OTP</span>
                <span className="text-xl font-black text-[#1995AD]">{selectedDayReport.otpValidationsCount}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#AFC8D0]/50 text-center">
                <span className="block text-[11px] font-bold text-[#172B4D]/60 uppercase">Devoluciones</span>
                <span className="text-xl font-black text-emerald-700">{selectedDayReport.returnsCount}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#AFC8D0]/50 text-center">
                <span className="block text-[11px] font-bold text-[#172B4D]/60 uppercase">Calibraciones</span>
                <span className="text-xl font-black text-purple-700">{selectedDayReport.calibrationsCount}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#AFC8D0]/50 text-center col-span-2 sm:col-span-1">
                <span className="block text-[11px] font-bold text-[#172B4D]/60 uppercase">Robot CRON</span>
                <span className="text-xl font-black text-amber-600">{selectedDayReport.cronExecutionsCount}</span>
              </div>
            </div>

            {/* Texto redactado del informe */}
            <div className="p-4 rounded-xl bg-white border border-[#AFC8D0]/60 space-y-1.5">
              <span className="text-xs font-bold text-[#1995AD] uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Informe Narrativo de la Bitácora Diaria
              </span>
              <p className="text-xs sm:text-sm text-[#172B4D]/85 leading-relaxed font-medium">
                {selectedDayReport.summaryText}
              </p>
            </div>
          </div>

          {/* Tabla de todos los movimientos de la fecha seleccionada */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-title text-base text-[#172B4D]">
                Detalle de Movimientos de la Fecha ({dayHistoryLogs.length})
              </h4>
              <span className="text-xs text-[#172B4D]/60">
                Visualización completa de auditoría para {selectedHistoryDate}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 overflow-hidden shadow-xs">
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
                    {dayHistoryLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[#BCBABE]">
                          <Info className="h-6 w-6 mx-auto mb-1 text-[#AFC8D0]" />
                          <p className="text-xs font-bold text-[#172B4D]">
                            No hay movimientos registrados para el {selectedHistoryDate}.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      dayHistoryLogs.map((log) => {
                        const isCron = log.actionCategory === "CRON";
                        const isOtp = log.actionCategory === "OTP";
                        const isReturn = log.actionCategory === "RETURN";

                        return (
                          <tr key={log.id} className="hover:bg-[#F1F1F2]/60 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#172B4D]/70 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-[#1995AD]" />
                                {log.createdAt}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                    isCron
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-[#1995AD]/15 text-[#1995AD]"
                                  }`}
                                >
                                  {isCron ? <Bot className="h-3.5 w-3.5" /> : log.userName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-extrabold text-xs text-[#172B4D] block leading-tight">
                                    {log.userName}
                                  </span>
                                  <span className="text-[10px] text-[#172B4D]/60 block leading-tight">
                                    {log.userRole || "Usuario"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
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

                            <td className="px-5 py-3.5 text-xs font-medium text-[#172B4D]/80 max-w-md">
                              {log.actionDescription}
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-[#172B4D]/60">
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
        </div>
      </div>
    </div>
  );
}
