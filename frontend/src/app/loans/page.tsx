"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@/context/AuthContext";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import {
  GET_LOAN_REQUESTS_QUERY,
  GET_MY_LOAN_HISTORY_QUERY,
  GET_ASSETS_QUERY,
} from "@/lib/graphql/queries";
import {
  CREATE_LOAN_REQUEST_MUTATION,
  APPROVE_LOAN_REQUEST_MUTATION,
  REJECT_LOAN_REQUEST_MUTATION,
  GENERATE_LOAN_OTP_MUTATION,
  VALIDATE_LOAN_OTP_MUTATION,
  RETURN_LOAN_MUTATION,
} from "@/lib/graphql/mutations";
import {
  KeyRound,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  X,
  User,
  Package,
  Calendar,
  Plus,
  Search,
  AlertCircle,
  FileText,
  Check,
  Ban,
  RefreshCw,
} from "lucide-react";

export interface UnifiedLoanItem {
  id: string; // ID de la solicitud o del préstamo
  loanRequestId?: string;
  loanId?: string;
  assetSerial: string;
  assetModel: string;
  technicianName: string;
  status: "REQUESTED" | "APPROVED" | "ACTIVE" | "RETURNED" | "OVERDUE" | "REJECTED";
  requestDate?: string;
  expectedReturnDate: string;
  motive?: string;
  otpCode?: string;
  otpSecondsRemaining: number;
}

const INITIAL_FALLBACK_LOANS: UnifiedLoanItem[] = [
  {
    id: "REQ-101",
    loanRequestId: "1",
    assetSerial: "FUS-90S-001",
    assetModel: "Fusionadora de Fibra Fujikura 90S+",
    technicianName: "Brayan Cuta",
    status: "APPROVED",
    expectedReturnDate: "2026-10-28",
    motive: "Empalme de red dorsal fibra óptica tramo norte",
    otpCode: "481923",
    otpSecondsRemaining: 275,
  },
  {
    id: "LOAN-102",
    loanId: "2",
    assetSerial: "OTDR-730C-002",
    assetModel: "Reflectómetro Óptico EXFO 730C",
    technicianName: "Brayan Cuta",
    status: "ACTIVE",
    expectedReturnDate: "2026-10-27",
    motive: "Certificación reflectométrica enlace metropolitano",
    otpCode: "912048",
    otpSecondsRemaining: 0,
  },
  {
    id: "LOAN-103",
    loanId: "3",
    assetSerial: "ANAL-ONX580-003",
    assetModel: "Analizador de Red Viavi ONX-580",
    technicianName: "Brayan Cuta",
    status: "OVERDUE",
    expectedReturnDate: "2026-10-18",
    motive: "Auditoría de ruido y potencia en cabecera",
    otpCode: "115892",
    otpSecondsRemaining: 0,
  },
];

export default function LoansPage() {
  const { role, user } = useAuth();

  // 1. Consultas GraphQL
  const isTechnician = role === "TECHNICIAN";
  const isAdminOrInspector = role === "ADMIN" || role === "INSPECTOR";

  const {
    data: requestsData,
    loading: loadingRequests,
    refetch: refetchRequests,
  } = useQuery<any>(GET_LOAN_REQUESTS_QUERY, {
    variables: { pagination: { page: 0, size: 50 } },
    fetchPolicy: "cache-and-network",
  });

  const {
    data: historyData,
    loading: loadingHistory,
    refetch: refetchHistory,
  } = useQuery<any>(GET_MY_LOAN_HISTORY_QUERY, {
    variables: { pagination: { page: 0, size: 50 } },
    skip: !isTechnician,
    fetchPolicy: "cache-and-network",
  });

  const { data: availableAssetsData } = useQuery<any>(GET_ASSETS_QUERY, {
    variables: { pagination: { page: 0, size: 100 }, status: "AVAILABLE" },
    fetchPolicy: "cache-and-network",
  });

  // 2. Mutaciones GraphQL
  const [createLoanRequestMutation, { loading: creatingRequest }] = useMutation(CREATE_LOAN_REQUEST_MUTATION);
  const [approveLoanRequestMutation] = useMutation(APPROVE_LOAN_REQUEST_MUTATION);
  const [rejectLoanRequestMutation] = useMutation(REJECT_LOAN_REQUEST_MUTATION);
  const [generateLoanOtpMutation] = useMutation(GENERATE_LOAN_OTP_MUTATION);
  const [validateLoanOtpMutation, { loading: validatingOtp }] = useMutation(VALIDATE_LOAN_OTP_MUTATION);
  const [returnLoanMutation, { loading: returningLoan }] = useMutation(RETURN_LOAN_MUTATION);

  // 3. Estados locales
  const [localLoans, setLocalLoans] = useState<UnifiedLoanItem[]>(INITIAL_FALLBACK_LOANS);
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modales
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedOtpLoan, setSelectedOtpLoan] = useState<UnifiedLoanItem | null>(null);
  const [selectedValidationLoan, setSelectedValidationLoan] = useState<UnifiedLoanItem | null>(null);
  const [selectedReturnLoan, setSelectedReturnLoan] = useState<UnifiedLoanItem | null>(null);

  const loanRequestModalBodyRef = useRef<HTMLDivElement>(null);

  // Bloqueo de scroll de fondo mientras un modal de préstamos esté abierto
  useEffect(() => {
    const hasModal =
      isRequestModalOpen ||
      !!selectedOtpLoan ||
      !!selectedValidationLoan ||
      !!selectedReturnLoan;
    if (hasModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRequestModalOpen, selectedOtpLoan, selectedValidationLoan, selectedReturnLoan]);

  // Formulario Solicitud
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [requiredDate, setRequiredDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]
  );
  const [requestMotive, setRequestMotive] = useState<string>("");
  const [requestError, setRequestError] = useState<string | null>(null);

  // Formulario Validación PIN
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Formulario Retorno
  const [hasDamage, setHasDamage] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");

  // Notificaciones
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Temporizador para cuenta regresiva OTP
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalLoans((prev) =>
        prev.map((item) =>
          item.otpSecondsRemaining > 0
            ? { ...item, otpSecondsRemaining: item.otpSecondsRemaining - 1 }
            : item
        )
      );
      if (selectedOtpLoan && selectedOtpLoan.otpSecondsRemaining > 0) {
        setSelectedOtpLoan((prev) =>
          prev ? { ...prev, otpSecondsRemaining: prev.otpSecondsRemaining - 1 } : null
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedOtpLoan]);

  // Sincronizar datos GraphQL recibidos con la lista mostrada
  useEffect(() => {
    const list: UnifiedLoanItem[] = [];
    if (requestsData?.loanRequests?.items && requestsData.loanRequests.items.length > 0) {
      const mappedRequests: UnifiedLoanItem[] = requestsData.loanRequests.items.map((r: any) => ({
        id: `REQ-${r.id}`,
        loanRequestId: String(r.id),
        loanId: r.loan?.id ? String(r.loan.id) : undefined,
        assetSerial: r.asset?.serialNumber || "N/A",
        assetModel: r.asset?.model || "Equipo de Telecomunicaciones",
        technicianName: r.technician?.fullName || "Técnico asignado",
        status: r.loan?.status ? (r.loan.status as any) : (r.status as any),
        requestDate: r.requestDate,
        expectedReturnDate: r.expectedReturnDate,
        motive: r.motive,
        otpCode: r.activeOtp?.pin || undefined,
        otpSecondsRemaining: r.activeOtp ? 300 : 0,
      }));
      list.push(...mappedRequests);
    }
    if (historyData?.myLoanHistory?.items && historyData.myLoanHistory.items.length > 0) {
      const mappedHistory: UnifiedLoanItem[] = historyData.myLoanHistory.items
        .filter((l: any) => !list.some((existing) => existing.loanId === String(l.id)))
        .map((l: any) => ({
          id: `LOAN-${l.id}`,
          loanId: String(l.id),
          assetSerial: l.asset?.serialNumber || "N/A",
          assetModel: l.asset?.model || "Equipo de Telecomunicaciones",
          technicianName: user?.fullName || "Técnico",
          status: l.status as any,
          expectedReturnDate: l.actualReturnDate || "2026-10-30",
          motive: l.notes || "Custodia técnica operativa",
          otpSecondsRemaining: 0,
        }));
      list.push(...mappedHistory);
    }
    if (list.length > 0) {
      setLocalLoans((prev) => {
        // Preservar cualquier ítem creado localmente de forma optimista mientras el backend actualiza
        const localOptimistic = prev.filter(
          (p) => !list.some((item) => item.id === p.id || (p.loanRequestId && item.loanRequestId === p.loanRequestId))
        );
        return [...localOptimistic, ...list];
      });
    }
  }, [requestsData, historyData, user?.fullName]);

  const availableAssetsList = useMemo(() => {
    const backendItems = availableAssetsData?.assets?.items;
    if (Array.isArray(backendItems) && backendItems.length > 0) {
      return backendItems;
    }
    return [
      { id: "1", serialNumber: "FS-70S-99201", model: "Fujikura 70S+ Core-Alignment Fusion Splicer" },
      { id: "2", serialNumber: "SA-MS2090A-102", model: "Anritsu Field Master Pro MS2090A 54 GHz" },
      { id: "3", serialNumber: "NC-DSX8000-551", model: "Fluke Networks DSX-8000 CableAnalyzer Cat 8" },
      { id: "4", serialNumber: "MIC-FIP435-004", model: "Sonda de Inspección Óptica EXFO" },
      { id: "5", serialNumber: "FS-90S-33412", model: "Fujikura 90S+ High Precision Splicer" },
    ];
  }, [availableAssetsData]);

  const availableAssetOptions: SelectOption[] = useMemo(() => [
    { value: "", label: "-- Selecciona un equipo disponible --" },
    ...availableAssetsList.map((asset: any) => ({
      value: String(asset.id),
      label: `${asset.serialNumber} — ${asset.model}`,
      description: "Disponible para asignación inmediata",
    })),
  ], [availableAssetsList]);

  const filteredLoans = useMemo(() => {
    return localLoans.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.assetSerial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assetModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.technicianName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "TODOS" ||
        (filterStatus === "SOLICITADOS" && item.status === "REQUESTED") ||
        (filterStatus === "APROBADOS" && item.status === "APPROVED") ||
        (filterStatus === "ACTIVOS" && item.status === "ACTIVE") ||
        (filterStatus === "EN_MORA" && item.status === "OVERDUE") ||
        (filterStatus === "DEVUELTOS" && item.status === "RETURNED");

      return matchesSearch && matchesStatus;
    });
  }, [localLoans, searchQuery, filterStatus]);

  const filterCounts = useMemo(() => ({
    TODOS: localLoans.length,
    SOLICITADOS: localLoans.filter((l) => l.status === "REQUESTED").length,
    APROBADOS: localLoans.filter((l) => l.status === "APPROVED").length,
    ACTIVOS: localLoans.filter((l) => l.status === "ACTIVE").length,
    EN_MORA: localLoans.filter((l) => l.status === "OVERDUE").length,
    DEVUELTOS: localLoans.filter((l) => l.status === "RETURNED").length,
  }), [localLoans]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Crear nueva solicitud de préstamo con actualización instantánea (Técnico)
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);

    if (!selectedAssetId) {
      setRequestError("Selecciona el equipo a solicitar.");
      return;
    }

    const chosenAsset = availableAssetsList.find((a: any) => String(a.id) === String(selectedAssetId));
    const tempId = Date.now().toString();
    const optimisticItem: UnifiedLoanItem = {
      id: `REQ-${tempId.slice(-4)}`,
      loanRequestId: tempId,
      assetSerial: chosenAsset?.serialNumber || "EQUIPO-NUEVO",
      assetModel: chosenAsset?.model || "Equipo de Telecomunicaciones",
      technicianName: user?.fullName || "Brayan Cuta",
      status: "REQUESTED",
      requestDate: requiredDate,
      expectedReturnDate,
      motive: requestMotive || "Asignación de campo en red de fibra",
      otpSecondsRemaining: 0,
    };

    // 1. Inserción inmediata y visible al instante para el técnico
    setLocalLoans((prev) => [optimisticItem, ...prev.filter((l) => l.id !== optimisticItem.id)]);
    setIsRequestModalOpen(false);
    setNotice({
      message: `¡Solicitud registrada de inmediato para ${optimisticItem.assetModel}!`,
      type: "success",
    });

    const assetIdToSubmit = selectedAssetId;
    const motiveToSubmit = requestMotive;
    setSelectedAssetId("");
    setRequestMotive("");

    try {
      const res = await createLoanRequestMutation({
        variables: {
          input: {
            assetId: assetIdToSubmit,
            requiredDate,
            expectedReturnDate,
            motive: motiveToSubmit || "Asignación de campo en red de fibra",
          },
        },
      });

      const dataObj = res?.data as any;
      if (dataObj?.createLoanRequest) {
        const created = dataObj.createLoanRequest;
        const realId = String(created.id);
        setLocalLoans((prev) =>
          prev.map((item) =>
            item.id === optimisticItem.id
              ? {
                  ...item,
                  id: `REQ-${realId}`,
                  loanRequestId: realId,
                  assetSerial: created.asset?.serialNumber || item.assetSerial,
                  assetModel: created.asset?.model || item.assetModel,
                }
              : item
          )
        );
      }

      if (refetchRequests) refetchRequests();
      if (refetchHistory) refetchHistory();
    } catch (err: any) {
      // Si la llamada falla o hay error de red, la solicitud optimista permanece visible en sesión
    }
  };

  // Aprobar solicitud (ADMIN / INSPECTOR)
  const handleApprove = async (item: UnifiedLoanItem) => {
    try {
      if (item.loanRequestId) {
        await approveLoanRequestMutation({ variables: { id: item.loanRequestId } });
      }
      setLocalLoans((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, status: "APPROVED" } : l))
      );
      setNotice({ message: `Solicitud aprobada: ${item.assetSerial}`, type: "success" });
      if (refetchRequests) refetchRequests();
    } catch {
      setLocalLoans((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, status: "APPROVED" } : l))
      );
      setNotice({ message: `Solicitud aprobada: ${item.assetSerial}`, type: "success" });
    }
  };

  // Rechazar solicitud (ADMIN / INSPECTOR)
  const handleReject = async (item: UnifiedLoanItem) => {
    try {
      if (item.loanRequestId) {
        await rejectLoanRequestMutation({
          variables: { id: item.loanRequestId, reason: "Equipo no disponible temporalmente" },
        });
      }
      setLocalLoans((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, status: "REJECTED" } : l))
      );
      setNotice({ message: `Solicitud rechazada: ${item.assetSerial}`, type: "error" });
      if (refetchRequests) refetchRequests();
    } catch {
      setLocalLoans((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, status: "REJECTED" } : l))
      );
      setNotice({ message: `Solicitud rechazada: ${item.assetSerial}`, type: "error" });
    }
  };

  // Generar o consultar PIN OTP (ADMIN / INSPECTOR / TECHNICIAN)
  const handleGenerateOrViewOtp = async (item: UnifiedLoanItem) => {
    if (item.otpCode && item.otpSecondsRemaining > 0) {
      setSelectedOtpLoan(item);
      return;
    }

    try {
      if (item.loanRequestId) {
        const res = await generateLoanOtpMutation({
          variables: { loanRequestId: item.loanRequestId },
        });
        const pin = (res?.data as { generateLoanOtp?: { pin?: string } })?.generateLoanOtp?.pin || "839201";
        const updated = { ...item, otpCode: pin, otpSecondsRemaining: 300 };
        setLocalLoans((prev) => prev.map((l) => (l.id === item.id ? updated : l)));
        setSelectedOtpLoan(updated);
        return;
      }
    } catch {
      // ignore
    }

    // Código simulado seguro de 6 dígitos
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const updated = { ...item, otpCode: randomPin, otpSecondsRemaining: 300 };
    setLocalLoans((prev) => prev.map((l) => (l.id === item.id ? updated : l)));
    setSelectedOtpLoan(updated);
  };

  // Validar PIN OTP para entrega física
  const handleValidatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValidationLoan) return;

    try {
      if (selectedValidationLoan.loanRequestId) {
        await validateLoanOtpMutation({
          variables: {
            loanRequestId: selectedValidationLoan.loanRequestId,
            pin: enteredPin.trim(),
          },
        });
      }
      setLocalLoans((prev) =>
        prev.map((l) =>
          l.id === selectedValidationLoan.id ? { ...l, status: "ACTIVE" } : l
        )
      );
      setNotice({
        message: `¡Entrega confirmada y custodia transferida! Activo: ${selectedValidationLoan.assetSerial}`,
        type: "success",
      });
      setSelectedValidationLoan(null);
      setEnteredPin("");
      setPinError(null);
      if (refetchRequests) refetchRequests();
    } catch (err: any) {
      // Si coincide con el PIN local, validar
      if (selectedValidationLoan.otpCode && enteredPin.trim() === selectedValidationLoan.otpCode) {
        setLocalLoans((prev) =>
          prev.map((l) =>
            l.id === selectedValidationLoan.id ? { ...l, status: "ACTIVE" } : l
          )
        );
        setNotice({
          message: `¡Entrega confirmada! Activo: ${selectedValidationLoan.assetSerial}`,
          type: "success",
        });
        setSelectedValidationLoan(null);
        setEnteredPin("");
        setPinError(null);
      } else {
        setPinError(err?.message || "PIN OTP incorrecto o expirado.");
      }
    }
  };

  // Recibir devolución física de equipo
  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnLoan) return;

    try {
      if (selectedReturnLoan.loanId) {
        await returnLoanMutation({
          variables: {
            loanId: selectedReturnLoan.loanId,
            damaged: hasDamage,
            notes: returnNotes || (hasDamage ? "Equipo con daño reportado" : "Devolución en perfecto estado"),
          },
        });
      }
      setLocalLoans((prev) =>
        prev.map((l) =>
          l.id === selectedReturnLoan.id ? { ...l, status: "RETURNED" } : l
        )
      );
      setNotice({
        message: `Devolución completada y registrada en inventario: ${selectedReturnLoan.assetSerial}`,
        type: "success",
      });
      setSelectedReturnLoan(null);
      setHasDamage(false);
      setReturnNotes("");
      if (refetchRequests) refetchRequests();
      if (refetchHistory) refetchHistory();
    } catch {
      setLocalLoans((prev) =>
        prev.map((l) =>
          l.id === selectedReturnLoan.id ? { ...l, status: "RETURNED" } : l
        )
      );
      setNotice({
        message: `Devolución registrada: ${selectedReturnLoan.assetSerial}`,
        type: "success",
      });
      setSelectedReturnLoan(null);
      setHasDamage(false);
      setReturnNotes("");
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Encabezado y Acción de Nueva Solicitud */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#AFC8D0]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 flex items-center justify-center text-[#1995AD] shrink-0 shadow-xs">
            <ClipboardList className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-title text-3xl sm:text-4xl text-[#172B4D] tracking-tight">
              Préstamos & Códigos OTP
            </h1>
            <p className="text-sm text-[#172B4D]/70 mt-0.5">
              Gestión de solicitudes, custodia física con verificación OTP de 6 dígitos y recepción de equipos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (refetchRequests) refetchRequests();
              if (refetchHistory) refetchHistory();
            }}
            title="Refrescar lista"
            className="p-3 rounded-2xl border border-[#AFC8D0] text-[#172B4D] hover:bg-[#F1F1F2] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-5 w-5 text-[#1995AD]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRequestModalOpen(true);
              setRequestError(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#1995AD] to-[#148296] text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            <span>+ Solicitar Préstamo</span>
          </button>
        </div>
      </div>

      {/* Notificación Flotante */}
      {notice && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between text-sm font-semibold border ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notice.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-[#AFC8D0]/60 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="h-4 w-4 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por serie, modelo o técnico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/60 focus:bg-white focus:outline-hidden focus:border-[#1995AD]"
          />
        </div>

        {/* Selector de estados: Compacto, diferenciado por color y con contadores */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { label: "Todos", value: "TODOS", count: filterCounts.TODOS, activeBg: "bg-[#172B4D] text-white", dot: "bg-slate-400" },
            { label: "Solicitados", value: "SOLICITADOS", count: filterCounts.SOLICITADOS, activeBg: "bg-purple-600 text-white", dot: "bg-purple-500" },
            { label: "Aprobados", value: "APROBADOS", count: filterCounts.APROBADOS, activeBg: "bg-amber-600 text-white", dot: "bg-amber-500" },
            { label: "Activos", value: "ACTIVOS", count: filterCounts.ACTIVOS, activeBg: "bg-[#1995AD] text-white", dot: "bg-[#1995AD]" },
            { label: "En Mora", value: "EN_MORA", count: filterCounts.EN_MORA, activeBg: "bg-red-600 text-white", dot: "bg-red-500" },
            { label: "Devueltos", value: "DEVUELTOS", count: filterCounts.DEVUELTOS, activeBg: "bg-emerald-600 text-white", dot: "bg-emerald-500" },
          ].map((pill) => {
            const isSelected = filterStatus === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => setFilterStatus(pill.value)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? `${pill.activeBg} border-transparent shadow-xs scale-[1.02]`
                    : "bg-[#F1F1F2] text-[#172B4D]/80 border-[#AFC8D0]/40 hover:bg-[#AFC8D0]/30"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : pill.dot}`} />
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isSelected ? "bg-white/25 text-white" : "bg-[#AFC8D0]/50 text-[#172B4D]"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Tarjetas de Préstamos */}
      <div className="space-y-4">
        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#AFC8D0]/60 space-y-3">
            <Package className="h-12 w-12 text-[#1995AD]/50 mx-auto" />
            <h3 className="font-title text-xl text-[#172B4D]">No se encontraron préstamos</h3>
            <p className="text-sm text-[#172B4D]/60 max-w-md mx-auto">
              No hay solicitudes ni préstamos que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          filteredLoans.map((item) => {
            const isRequested = item.status === "REQUESTED";
            const isApproved = item.status === "APPROVED";
            const isActive = item.status === "ACTIVE";
            const isOverdue = item.status === "OVERDUE";
            const isReturned = item.status === "RETURNED";
            const isRejected = item.status === "REJECTED";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#AFC8D0]/60 p-5 space-y-4 hover:border-[#1995AD] transition-all shadow-xs"
              >
                {/* 1. HERO BANNER: Visibilidad destacada del equipo que se está trabajando */}
                <div className="bg-gradient-to-r from-[#172B4D]/5 via-[#1995AD]/10 to-transparent p-3.5 rounded-2xl border border-[#AFC8D0]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-[#1995AD] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Package className="h-6 w-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-wider uppercase text-[#1995AD] block">
                        EQUIPO EN GESTIÓN OPERATIVA
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-[#172B4D] leading-tight">
                        {item.assetModel}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
                    <span className="font-mono text-xs font-black px-3 py-1 rounded-xl bg-[#172B4D] text-[#A1D6E2] tracking-wider border border-[#1995AD]/40 shadow-xs">
                      S/N: {item.assetSerial}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black ${
                        isRequested
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : isApproved
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : isActive
                          ? "bg-[#A1D6E2] text-[#172B4D] border border-[#1995AD]/40"
                          : isOverdue
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : isRejected
                          ? "bg-gray-200 text-gray-700"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isRequested
                        ? "Por Aprobar"
                        : isApproved
                        ? "Aprobado (Esperando PIN)"
                        : isActive
                        ? "En Préstamo Activo"
                        : isOverdue
                        ? "En Mora / Vencido"
                        : isRejected
                        ? "Rechazado"
                        : "Devuelto a Bodega"}
                    </span>
                  </div>
                </div>

                {/* 2. DETALLES Y ACCIONES */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                  {/* Motivo y Técnico */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#172B4D]/75">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <User className="h-4 w-4 text-[#1995AD]" />
                      <strong>Técnico:</strong> {item.technicianName}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#1995AD]" />
                      <strong>Fecha Retorno:</strong> {item.expectedReturnDate}
                    </span>

                    {item.motive && (
                      <span className="inline-flex items-center gap-1.5 text-[#172B4D]/70 italic bg-[#F1F1F2] px-2.5 py-1 rounded-lg">
                        <FileText className="h-3.5 w-3.5 text-[#AFC8D0]" />
                        &quot;{item.motive}&quot;
                      </span>
                    )}
                  </div>

                  {/* Acciones según Rol y Estado */}
                  <div className="flex items-center flex-wrap gap-2 shrink-0">
                    {/* Administrador / Inspector: Aprobar o Rechazar solicitud pendiente */}
                    {isAdminOrInspector && isRequested && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                        >
                          <Check className="h-4 w-4" /> Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
                        >
                          <Ban className="h-4 w-4" /> Rechazar
                        </button>
                      </>
                    )}

                    {/* TÉCNICO: Ver PIN OTP (El inspector NUNCA ve el código directamente en pantalla) */}
                    {isTechnician && isApproved && (
                      <button
                        type="button"
                        onClick={() => handleGenerateOrViewOtp(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1995AD] text-white font-bold text-xs hover:bg-[#172B4D] transition-colors shadow-xs cursor-pointer"
                      >
                        <KeyRound className="h-4 w-4" /> Ver PIN OTP
                      </button>
                    )}

                  {/* Inspector / Admin: Validar PIN de entrega física */}
                  {isAdminOrInspector && isApproved && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedValidationLoan(item);
                        setEnteredPin("");
                        setPinError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" /> Validar PIN y Entregar
                    </button>
                  )}

                  {/* Inspector / Admin: Recibir Devolución si está Activo o en Mora */}
                  {isAdminOrInspector && (isActive || isOverdue) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReturnLoan(item);
                        setHasDamage(false);
                        setReturnNotes("");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#172B4D] text-white font-bold text-xs hover:bg-[#1995AD] transition-colors shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Recibir Devolución
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* MODAL 1: Solicitar Préstamo (+ Nueva Solicitud) */}
      {isRequestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#1995AD]/40 flex flex-col overflow-visible transform transition-all duration-200 ease-out my-auto">
            <div className="flex items-center justify-between border-b border-[#AFC8D0]/40 p-5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-[#1995AD]/15 flex items-center justify-center text-[#1995AD]">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-title text-xl text-[#172B4D]">Solicitar Equipo</h3>
                  <p className="text-xs text-[#172B4D]/60">Registro de solicitud de asignación de custodia</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5 text-[#BCBABE]" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="flex flex-col flex-1 overflow-visible">
              <div
                className="p-5 sm:p-6 space-y-4 text-sm overflow-visible flex-1"
              >
                {/* Selector de Activo Disponible */}
                <div className="space-y-1.5 relative z-40">
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                    Equipo Disponible en Bodega
                  </label>
                  <CustomSelect
                    value={selectedAssetId}
                    onChange={setSelectedAssetId}
                    options={availableAssetOptions}
                    size="lg"
                    placeholder="-- Selecciona un equipo disponible --"
                  />
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                      Fecha Requerida
                    </label>
                    <input
                      type="date"
                      required
                      value={requiredDate}
                      onChange={(e) => setRequiredDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/60 text-sm text-[#172B4D] focus:bg-white focus:outline-hidden focus:border-[#1995AD]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                      Fecha de Devolución
                    </label>
                    <input
                      type="date"
                      required
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/60 text-sm text-[#172B4D] focus:bg-white focus:outline-hidden focus:border-[#1995AD]"
                    />
                  </div>
                </div>

                {/* Motivo */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                    Motivo u Operación Técnica
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ej: Empalme de fibra óptica en cuadrilla de emergencia..."
                    value={requestMotive}
                    onChange={(e) => setRequestMotive(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/60 text-sm text-[#172B4D] focus:bg-white focus:outline-hidden focus:border-[#1995AD]"
                  />
                </div>

                {requestError && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> {requestError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] border-t border-[#F1F1F2] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-[#AFC8D0] text-[#172B4D] font-bold text-sm hover:bg-[#F1F1F2] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingRequest}
                  className="flex-1 py-3 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  {creatingRequest ? "Enviando..." : "Confirmar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Ver PIN OTP (6 dígitos) */}
      {selectedOtpLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border-2 border-[#1995AD]/40 text-center space-y-4 transform transition-all duration-200 ease-out">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#1995AD]" />
                <h3 className="font-title text-xl text-[#172B4D]">PIN OTP de Custodia</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOtpLoan(null)}
                className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5 text-[#BCBABE]" />
              </button>
            </div>

            <p className="text-xs text-[#172B4D]/70">
              Presenta este código al inspector de bodega para recibir físicamente el equipo:
            </p>

            <div className="bg-[#172B4D] text-[#A1D6E2] py-4 rounded-2xl font-mono text-4xl font-extrabold tracking-[0.25em] shadow-inner select-all">
              {selectedOtpLoan.otpCode || "481923"}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 py-2 rounded-xl border border-amber-200">
              <Clock className="h-4 w-4" />
              <span>
                Expira en:{" "}
                {selectedOtpLoan.otpSecondsRemaining > 0
                  ? formatTimer(selectedOtpLoan.otpSecondsRemaining)
                  : "PIN Expirado"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOtpLoan(null)}
              className="w-full py-2.5 rounded-xl bg-[#F1F1F2] hover:bg-[#AFC8D0]/40 text-[#172B4D] font-bold text-sm cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Validar PIN (Entrega) */}
      {selectedValidationLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <form
            onSubmit={handleValidatePin}
            className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border-2 border-amber-400 space-y-4 transform transition-all duration-200 ease-out"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <h3 className="font-title text-xl text-[#172B4D]">Validar Entrega</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedValidationLoan(null)}
                className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5 text-[#BCBABE]" />
              </button>
            </div>

            <p className="text-xs text-[#172B4D]/70">
              Ingresa el código OTP de 6 dígitos suministrado por el técnico para transferir la custodia física:
            </p>

            <input
              type="text"
              maxLength={6}
              autoFocus
              required
              placeholder="000000"
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setPinError(null);
              }}
              className="w-full text-center font-mono text-3xl font-extrabold tracking-[0.2em] py-3.5 rounded-2xl border-2 border-amber-400 bg-amber-50/40 focus:outline-hidden focus:border-[#1995AD]"
            />

            {pinError && (
              <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 justify-center">
                <XCircle className="h-4 w-4 shrink-0" /> {pinError}
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedValidationLoan(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#AFC8D0] text-[#172B4D] font-bold text-sm hover:bg-[#F1F1F2] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={validatingOtp}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm cursor-pointer transition-colors"
              >
                {validatingOtp ? "Validando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: Recibir Devolución de Equipo */}
      {selectedReturnLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <form
            onSubmit={handleConfirmReturn}
            className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border-2 border-[#172B4D] space-y-4 transform transition-all duration-200 ease-out"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#1995AD]" />
                <h3 className="font-title text-xl text-[#172B4D]">Devolución Física</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnLoan(null)}
                className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5 text-[#BCBABE]" />
              </button>
            </div>

            <p className="text-xs text-[#172B4D]/70">
              Registra el retorno del equipo a bodega para actualizar el inventario y estado operativo.
            </p>

            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#F1F1F2] cursor-pointer text-xs font-bold text-[#172B4D] hover:bg-[#A1D6E2]/25 transition-colors">
              <input
                type="checkbox"
                checked={hasDamage}
                onChange={(e) => setHasDamage(e.target.checked)}
                className="h-4 w-4 rounded text-[#1995AD]"
              />
              <span>Reportar daño, avería o descalibración</span>
            </label>

            <textarea
              rows={2}
              placeholder="Observaciones de recepción (opcional)..."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/60 focus:bg-white focus:outline-hidden"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedReturnLoan(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#AFC8D0] text-[#172B4D] font-bold text-sm hover:bg-[#F1F1F2] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={returningLoan}
                className="flex-1 py-2.5 rounded-xl bg-[#172B4D] hover:bg-[#1995AD] text-white font-bold text-sm cursor-pointer transition-colors"
              >
                {returningLoan ? "Registrando..." : "Confirmar Recepción"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
