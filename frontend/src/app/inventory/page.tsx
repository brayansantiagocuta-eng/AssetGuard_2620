"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@/context/AuthContext";
import { GET_ASSETS_QUERY } from "@/lib/graphql/queries";
import {
  CREATE_ASSET_MUTATION,
  BULK_UPLOAD_ASSETS_FILE_MUTATION,
  CREATE_LOAN_REQUEST_MUTATION,
  UPDATE_ASSET_STATUS_MUTATION,
} from "@/lib/graphql/mutations";
import {
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Calculator,
  X,
  Package,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Check,
} from "lucide-react";

interface AssetItem {
  id: string;
  serialNumber: string;
  model: string;
  category: string;
  location: string;
  estimatedValue: number;
  acquisitionDate: string;
  status: "AVAILABLE" | "ON_LOAN" | "MAINTENANCE" | "RESERVED";
  usageCycles: number;
  maxUsageCycles: number;
  lastCalibrationDate: string;
  calibrationIntervalDays: number;
}

const INITIAL_ASSETS: AssetItem[] = [
  {
    id: "1",
    serialNumber: "FUS-90S-001",
    model: "Fusionadora de Fibra Fujikura 90S+",
    category: "Fusionadoras",
    location: "Bodega Principal - A1",
    estimatedValue: 8500.0,
    acquisitionDate: "2025-04-15",
    status: "AVAILABLE",
    usageCycles: 120,
    maxUsageCycles: 1000,
    lastCalibrationDate: "2026-06-01",
    calibrationIntervalDays: 180,
  },
  {
    id: "2",
    serialNumber: "OTDR-MAX-730C-002",
    model: "Reflectómetro Óptico EXFO 730C",
    category: "Reflectómetros",
    location: "Bodega Principal - B2",
    estimatedValue: 12000.0,
    acquisitionDate: "2025-01-20",
    status: "ON_LOAN",
    usageCycles: 380,
    maxUsageCycles: 500,
    lastCalibrationDate: "2026-05-10",
    calibrationIntervalDays: 180,
  },
  {
    id: "3",
    serialNumber: "ANAL-VIAVI-ONX-003",
    model: "Analizador de Red Viavi ONX-580",
    category: "Analizadores",
    location: "Laboratorio",
    estimatedValue: 9200.0,
    acquisitionDate: "2024-10-10",
    status: "MAINTENANCE",
    usageCycles: 495,
    maxUsageCycles: 500,
    lastCalibrationDate: "2025-10-15",
    calibrationIntervalDays: 180,
  },
  {
    id: "4",
    serialNumber: "PWR-FIP-435B-004",
    model: "Sonda de Inspección Óptica EXFO",
    category: "Microscopios",
    location: "Bodega Principal - C1",
    estimatedValue: 3100.0,
    acquisitionDate: "2025-08-01",
    status: "AVAILABLE",
    usageCycles: 85,
    maxUsageCycles: 400,
    lastCalibrationDate: "2026-08-01",
    calibrationIntervalDays: 180,
  },
  {
    id: "5",
    serialNumber: "FUS-70S-005",
    model: "Fusionadora de Fibra Fujikura 70S",
    category: "Fusionadoras",
    location: "Bodega Principal - A2",
    estimatedValue: 6200.0,
    acquisitionDate: "2025-06-10",
    status: "AVAILABLE",
    usageCycles: 210,
    maxUsageCycles: 800,
    lastCalibrationDate: "2026-07-20",
    calibrationIntervalDays: 180,
  },
  {
    id: "6",
    serialNumber: "FUS-T72C-006",
    model: "Fusionadora de Fibra Sumitomo T-72C",
    category: "Fusionadoras",
    location: "Bodega Principal - A1",
    estimatedValue: 7800.0,
    acquisitionDate: "2025-03-12",
    status: "AVAILABLE",
    usageCycles: 190,
    maxUsageCycles: 900,
    lastCalibrationDate: "2026-07-01",
    calibrationIntervalDays: 180,
  },
  {
    id: "7",
    serialNumber: "FUS-INNO-V7-007",
    model: "Fusionadora de Fibra INNO View 7",
    category: "Fusionadoras",
    location: "Bodega Principal - A2",
    estimatedValue: 5900.0,
    acquisitionDate: "2024-11-25",
    status: "ON_LOAN",
    usageCycles: 410,
    maxUsageCycles: 800,
    lastCalibrationDate: "2026-04-15",
    calibrationIntervalDays: 180,
  },
  {
    id: "8",
    serialNumber: "OTDR-SMART-008",
    model: "Reflectómetro Óptico Viavi SmartOTDR",
    category: "Reflectómetros",
    location: "Bodega Principal - B2",
    estimatedValue: 9500.0,
    acquisitionDate: "2025-05-18",
    status: "AVAILABLE",
    usageCycles: 145,
    maxUsageCycles: 500,
    lastCalibrationDate: "2026-06-20",
    calibrationIntervalDays: 180,
  },
  {
    id: "9",
    serialNumber: "OTDR-AQ7280-009",
    model: "Reflectómetro Óptico Yokogawa AQ7280",
    category: "Reflectómetros",
    location: "Laboratorio",
    estimatedValue: 11200.0,
    acquisitionDate: "2025-02-08",
    status: "AVAILABLE",
    usageCycles: 290,
    maxUsageCycles: 600,
    lastCalibrationDate: "2026-05-12",
    calibrationIntervalDays: 180,
  },
  {
    id: "10",
    serialNumber: "OTDR-MT9085-010",
    model: "Reflectómetro Óptico Anritsu MT9085",
    category: "Reflectómetros",
    location: "Bodega Principal - B2",
    estimatedValue: 10400.0,
    acquisitionDate: "2024-09-14",
    status: "MAINTENANCE",
    usageCycles: 485,
    maxUsageCycles: 500,
    lastCalibrationDate: "2025-11-10",
    calibrationIntervalDays: 180,
  },
  {
    id: "11",
    serialNumber: "ANAL-FTB1-011",
    model: "Analizador de Red EXFO FTB-1",
    category: "Analizadores",
    location: "Laboratorio",
    estimatedValue: 11400.0,
    acquisitionDate: "2025-07-04",
    status: "AVAILABLE",
    usageCycles: 110,
    maxUsageCycles: 600,
    lastCalibrationDate: "2026-07-10",
    calibrationIntervalDays: 180,
  },
  {
    id: "12",
    serialNumber: "ANAL-FLK-DSX-012",
    model: "Analizador de Red Fluke DSX-8000",
    category: "Analizadores",
    location: "Bodega Principal - C1",
    estimatedValue: 13500.0,
    acquisitionDate: "2025-01-30",
    status: "ON_LOAN",
    usageCycles: 320,
    maxUsageCycles: 600,
    lastCalibrationDate: "2026-04-22",
    calibrationIntervalDays: 180,
  },
  {
    id: "13",
    serialNumber: "ANAL-ANR-MS20-013",
    model: "Analizador de Red Anritsu MS2090A",
    category: "Analizadores",
    location: "Laboratorio",
    estimatedValue: 14200.0,
    acquisitionDate: "2025-08-22",
    status: "AVAILABLE",
    usageCycles: 95,
    maxUsageCycles: 700,
    lastCalibrationDate: "2026-08-15",
    calibrationIntervalDays: 180,
  },
  {
    id: "14",
    serialNumber: "PWR-P5000I-014",
    model: "Sonda de Inspección Óptica Viavi P5000i",
    category: "Microscopios",
    location: "Bodega Principal - C1",
    estimatedValue: 2800.0,
    acquisitionDate: "2025-06-19",
    status: "AVAILABLE",
    usageCycles: 160,
    maxUsageCycles: 400,
    lastCalibrationDate: "2026-07-05",
    calibrationIntervalDays: 180,
  },
  {
    id: "15",
    serialNumber: "PWR-FLK-FI7000-015",
    model: "Sonda de Inspección Óptica Fluke FI-7000",
    category: "Microscopios",
    location: "Bodega Principal - A1",
    estimatedValue: 3450.0,
    acquisitionDate: "2024-12-05",
    status: "AVAILABLE",
    usageCycles: 315,
    maxUsageCycles: 400,
    lastCalibrationDate: "2026-03-18",
    calibrationIntervalDays: 180,
  },
];

const formatCurrency = (val: number) =>
  `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InventoryPage() {
  const { role } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>(INITIAL_ASSETS);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isChartsOpen, setIsChartsOpen] = useState<boolean>(false);
  const [selectedAssetForDepreciation, setSelectedAssetForDepreciation] =
    useState<AssetItem | null>(null);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(5);
  const [selectedAssetForRequest, setSelectedAssetForRequest] = useState<AssetItem | null>(null);
  const [selectedAssetForStatusChange, setSelectedAssetForStatusChange] = useState<AssetItem | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<"AVAILABLE" | "ON_LOAN" | "MAINTENANCE" | "RESERVED">("AVAILABLE");
  const [statusChangeNotes, setStatusChangeNotes] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // GraphQL hooks
  const { data: assetsData, refetch } = useQuery<any>(GET_ASSETS_QUERY, {
    variables: { pagination: { page: 0, size: 50 } },
    fetchPolicy: "cache-and-network",
  });
  const [createAssetMutation] = useMutation(CREATE_ASSET_MUTATION);
  const [bulkUploadFileMutation] = useMutation(BULK_UPLOAD_ASSETS_FILE_MUTATION);
  const [createLoanRequestMutation] = useMutation(CREATE_LOAN_REQUEST_MUTATION);
  const [updateAssetStatusMutation] = useMutation(UPDATE_ASSET_STATUS_MUTATION);

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForStatusChange) return;
    setUpdatingStatus(true);
    try {
      await updateAssetStatusMutation({
        variables: {
          id: selectedAssetForStatusChange.id,
          status: newStatusValue,
          notes: statusChangeNotes.trim() || undefined,
        },
      });
      setAssets((prev) =>
        prev.map((a) =>
          a.id === selectedAssetForStatusChange.id ? { ...a, status: newStatusValue } : a
        )
      );
      setNotice(`Estado del equipo ${selectedAssetForStatusChange.model} (${selectedAssetForStatusChange.serialNumber}) actualizado a ${newStatusValue}.`);
      setSelectedAssetForStatusChange(null);
      setStatusChangeNotes("");
      if (refetch) refetch();
    } catch {
      // Fallback local update
      setAssets((prev) =>
        prev.map((a) =>
          a.id === selectedAssetForStatusChange.id ? { ...a, status: newStatusValue } : a
        )
      );
      setNotice(`Estado actualizado localmente para ${selectedAssetForStatusChange.model}.`);
      setSelectedAssetForStatusChange(null);
      setStatusChangeNotes("");
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (assetsData?.assets?.items && assetsData.assets.items.length > 0) {
      // Mapa de los 15 equipos oficiales para ignorar filas de Excel importadas previamente y conservar los 10 nuevos
      const officialBySerial = new Map(
        INITIAL_ASSETS.map((item) => [item.serialNumber.toUpperCase(), item])
      );

      const normalizeStatus = (rawStatus?: string, fallback?: AssetItem["status"]): AssetItem["status"] => {
        if (rawStatus === "LOANED" || rawStatus === "ON_LOAN") return "ON_LOAN";
        if (rawStatus === "MAINTENANCE") return "MAINTENANCE";
        if (rawStatus === "AVAILABLE") return "AVAILABLE";
        return fallback || "AVAILABLE";
      };

      const dbBySerial = new Map<string, any>();
      for (const a of assetsData.assets.items) {
        const key = String(a.serialNumber || "").toUpperCase();
        if (officialBySerial.has(key)) {
          dbBySerial.set(key, a);
        }
      }

      const mergedOfficial: AssetItem[] = INITIAL_ASSETS.map((baseItem) => {
        const dbMatch = dbBySerial.get(baseItem.serialNumber.toUpperCase());
        if (!dbMatch) return baseItem;
        return {
          ...baseItem,
          id: String(dbMatch.id),
          estimatedValue: Number(dbMatch.estimatedValue) || baseItem.estimatedValue,
          status: normalizeStatus(dbMatch.status, baseItem.status),
        };
      });

      setAssets(mergedOfficial);
    }
  }, [assetsData]);

  // Catálogo oficial de modelos por categoría (se actualiza si el Admin agrega un nuevo modelo)
  const [equipmentCatalog, setEquipmentCatalog] = useState<
    Record<string, { model: string; serialPrefix: string; defaultPrice: number; maxCycles: number }[]>
  >({
    Fusionadoras: [
      {
        model: "Fusionadora de Fibra Fujikura 90S+",
        serialPrefix: "FUS-90S",
        defaultPrice: 8500,
        maxCycles: 1000,
      },
      {
        model: "Fusionadora de Fibra Fujikura 70S",
        serialPrefix: "FUS-70S",
        defaultPrice: 6200,
        maxCycles: 800,
      },
      {
        model: "Fusionadora de Fibra Sumitomo T-72C",
        serialPrefix: "FUS-T72C",
        defaultPrice: 7800,
        maxCycles: 900,
      },
    ],
    Reflectómetros: [
      {
        model: "Reflectómetro Óptico EXFO 730C",
        serialPrefix: "OTDR-MAX-730C",
        defaultPrice: 12000,
        maxCycles: 500,
      },
      {
        model: "Reflectómetro Óptico Viavi SmartOTDR",
        serialPrefix: "OTDR-SMART",
        defaultPrice: 9500,
        maxCycles: 500,
      },
    ],
    Analizadores: [
      {
        model: "Analizador de Red Viavi ONX-580",
        serialPrefix: "ANAL-VIAVI-ONX",
        defaultPrice: 9200,
        maxCycles: 500,
      },
      {
        model: "Analizador de Espectro EXFO FTB-1",
        serialPrefix: "ANAL-FTB1",
        defaultPrice: 11400,
        maxCycles: 600,
      },
    ],
    Microscopios: [
      {
        model: "Sonda de Inspección Óptica EXFO",
        serialPrefix: "PWR-FIP-435B",
        defaultPrice: 3100,
        maxCycles: 400,
      },
      {
        model: "Microscopio Digital de Fibra Viavi P5000i",
        serialPrefix: "PWR-P5000I",
        defaultPrice: 2800,
        maxCycles: 400,
      },
    ],
  });

  const CATEGORY_PREFIX: Record<string, string> = {
    Fusionadoras: "FUS",
    Reflectómetros: "OTDR",
    Analizadores: "ANAL",
    Microscopios: "PWR",
  };

  const CATEGORY_BASE_NAME: Record<string, string> = {
    Fusionadoras: "Fusionadora de Fibra",
    Reflectómetros: "Reflectómetro Óptico",
    Analizadores: "Analizador de Red",
    Microscopios: "Sonda de Inspección Óptica",
  };

  const AUTHORIZED_BRANDS_BY_CATEGORY: Record<string, string[]> = {
    Fusionadoras: ["Fujikura", "Sumitomo", "INNO", "Furukawa"],
    Reflectómetros: ["EXFO", "Viavi", "Yokogawa", "Anritsu", "Fluke"],
    Analizadores: ["Viavi", "EXFO", "Fluke", "Anritsu"],
    Microscopios: ["EXFO", "Viavi", "Fujikura", "Fluke"],
  };

  const WAREHOUSE_LOCATIONS = [
    "Bodega Principal - A1",
    "Bodega Principal - A2",
    "Bodega Principal - B2",
    "Bodega Principal - C1",
    "Laboratorio",
  ];

  const getNextConsecutive = () => String(assets.length + 1).padStart(3, "0");

  // New asset form state
  const [newCategory, setNewCategory] = useState("Fusionadoras");
  const [newModel, setNewModel] = useState("Fusionadora de Fibra Fujikura 90S+");
  const [isAddingCustomModel, setIsAddingCustomModel] = useState(false);
  const [customBrand, setCustomBrand] = useState("Fujikura");
  const [customRefCode, setCustomRefCode] = useState("");
  const [customModelError, setCustomModelError] = useState<string | null>(null);
  const [newSerial, setNewSerial] = useState("FUS-90S-006");
  const [newLocation, setNewLocation] = useState("Bodega Principal - A1");
  const [newValue, setNewValue] = useState("");
  const [defaultReturnDate, setDefaultReturnDate] = useState("");
  const [requestMotive, setRequestMotive] = useState("");

  const buildStructuredModelName = (cat: string, brand: string, refCode: string) => {
    const base = CATEGORY_BASE_NAME[cat] || "Equipo Óptico";
    return `${base} ${brand} ${refCode.trim().toUpperCase()}`.trim();
  };

  const buildStructuredSerialPrefix = (cat: string, refCode: string) => {
    const basePrefix = CATEGORY_PREFIX[cat] || "EQP";
    const cleanRef = refCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "REF";
    return `${basePrefix}-${cleanRef}`;
  };

  const handleCategoryChange = (cat: string) => {
    setNewCategory(cat);
    setCustomModelError(null);

    const allowedBrands = AUTHORIZED_BRANDS_BY_CATEGORY[cat] || ["Fujikura"];
    const nextBrand = allowedBrands.includes(customBrand) ? customBrand : allowedBrands[0];
    setCustomBrand(nextBrand);

    // Si estaba en "+ Nuevo modelo", conservamos todo el progreso (referencia, modo y precio)
    if (isAddingCustomModel) {
      const prefix = buildStructuredSerialPrefix(cat, customRefCode);
      setNewSerial(`${prefix}-${getNextConsecutive()}`);
      return;
    }

    const firstModel = equipmentCatalog[cat]?.[0];
    if (firstModel) {
      setNewModel(firstModel.model);
      setNewSerial(`${firstModel.serialPrefix}-${getNextConsecutive()}`);
    }
  };

  const handleModelChange = (modelValue: string) => {
    setCustomModelError(null);
    if (modelValue === "__NEW_MODEL__") {
      setIsAddingCustomModel(true);
      const allowedBrands = AUTHORIZED_BRANDS_BY_CATEGORY[newCategory] || ["Fujikura"];
      if (!allowedBrands.includes(customBrand)) {
        setCustomBrand(allowedBrands[0]);
      }
      const prefix = buildStructuredSerialPrefix(newCategory, customRefCode);
      setNewSerial(`${prefix}-${getNextConsecutive()}`);
      return;
    }
    setIsAddingCustomModel(false);
    setNewModel(modelValue);
    const found = equipmentCatalog[newCategory]?.find((m) => m.model === modelValue);
    if (found) {
      setNewSerial(`${found.serialPrefix}-${getNextConsecutive()}`);
    }
  };

  const handleCustomRefChange = (raw: string) => {
    // Solo letras mayúsculas, números y guion (máximo 8 caracteres, sin espacios ni palabras libres)
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8);
    setCustomRefCode(cleaned);
    setCustomModelError(null);
    const prefix = buildStructuredSerialPrefix(newCategory, cleaned);
    setNewSerial(`${prefix}-${getNextConsecutive()}`);
  };

  const openNewAssetModal = () => {
    setCustomModelError(null);
    // Conserva el progreso actual y solo actualiza el consecutivo por si cambió la cantidad de equipos
    if (isAddingCustomModel) {
      const prefix = buildStructuredSerialPrefix(newCategory, customRefCode);
      setNewSerial(`${prefix}-${getNextConsecutive()}`);
    } else {
      const found =
        equipmentCatalog[newCategory]?.find((m) => m.model === newModel) ||
        equipmentCatalog[newCategory]?.[0];
      if (found) {
        setNewModel(found.model);
        setNewSerial(`${found.serialPrefix}-${getNextConsecutive()}`);
      }
    }
    setIsNewAssetModalOpen(true);
  };

  // Cálculo claro paso a paso de depreciación en línea recta
  const calculateDepreciation = (asset: AssetItem, years = 5) => {
    const acq = new Date(asset.acquisitionDate);
    const now = new Date();
    const rawMonths =
      (now.getFullYear() - acq.getFullYear()) * 12 + (now.getMonth() - acq.getMonth());
    const totalMonths = years * 12;
    const monthsElapsed = Math.min(totalMonths, Math.max(1, rawMonths));
    const monthlyRate = asset.estimatedValue / totalMonths;
    const accumulated = Math.min(asset.estimatedValue, monthlyRate * monthsElapsed);
    const bookValue = Math.max(0, asset.estimatedValue - accumulated);
    const percentDepreciated = Math.min(
      100,
      Math.round((accumulated / Math.max(1, asset.estimatedValue)) * 100)
    );

    return {
      monthsElapsed,
      totalMonths,
      monthlyRate,
      accumulated,
      bookValue,
      percentDepreciated,
      percentRemaining: 100 - percentDepreciated,
    };
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || asset.category === categoryFilter;
    const matchesLocation = locationFilter === "ALL" || asset.location === locationFilter;
    const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  });

  // Totales claros de los equipos filtrados
  const totalPurchaseValue = filteredAssets.reduce((acc, a) => acc + a.estimatedValue, 0);
  const totalAccumulatedDepreciation = filteredAssets.reduce(
    (acc, a) => acc + calculateDepreciation(a, 5).accumulated,
    0
  );
  const totalCurrentBookValue = Math.max(0, totalPurchaseValue - totalAccumulatedDepreciation);

  const getCalibrationBadge = (asset: AssetItem) => {
    const cycleRatio = asset.usageCycles / asset.maxUsageCycles;
    if (asset.status === "MAINTENANCE" || cycleRatio >= 1.0) {
      return {
        label: "Requiere Calibrar",
        barColor: "bg-red-500",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: AlertCircle,
      };
    }
    if (cycleRatio >= 0.75) {
      return {
        label: "Próximo a Calibrar",
        barColor: "bg-amber-500",
        className: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Clock,
      };
    }
    return {
      label: "Óptimo",
      barColor: "bg-emerald-500",
      className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: CheckCircle,
    };
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingCustomModel) {
      // Exige un código de referencia industrial real (2 a 8 caracteres y debe incluir al menos un número, ej: 45S, 720C, ONX-600)
      const validRefRegex = /^(?=.*[0-9])[A-Z0-9-]{2,8}$/;
      if (!validRefRegex.test(customRefCode.trim())) {
        setCustomModelError(
          "Ingresa un código de referencia válido (2-8 caracteres con números, ej: 45S, 720C, T-82)."
        );
        return;
      }
    }

    const finalModelName = isAddingCustomModel
      ? buildStructuredModelName(newCategory, customBrand, customRefCode)
      : newModel;
    if (!finalModelName) return;

    const numericPrice = parseFloat(newValue) || 0;

    // Si el Admin armó un nuevo modelo, lo guardamos en el desplegable de esa categoría para futuros registros
    if (isAddingCustomModel) {
      const newPrefix = buildStructuredSerialPrefix(newCategory, customRefCode);
      setEquipmentCatalog((prev) => ({
        ...prev,
        [newCategory]: [
          ...(prev[newCategory] || []),
          {
            model: finalModelName,
            serialPrefix: newPrefix,
            defaultPrice: numericPrice,
            maxCycles: 500,
          },
        ],
      }));
    }

    try {
      await createAssetMutation({
        variables: {
          input: {
            serialNumber: newSerial.toUpperCase(),
            model: finalModelName,
            estimatedValue: numericPrice,
            acquisitionDate: new Date().toISOString().split("T")[0],
            categoryId: 1,
            locationId: 1,
          },
        },
      });
      await refetch();
    } catch {
      const foundSpec = equipmentCatalog[newCategory]?.find((m) => m.model === finalModelName);
      const created: AssetItem = {
        id: String(Date.now()),
        serialNumber: newSerial.toUpperCase(),
        model: finalModelName,
        category: newCategory,
        location: newLocation,
        estimatedValue: numericPrice,
        acquisitionDate: new Date().toISOString().split("T")[0],
        status: "AVAILABLE",
        usageCycles: 0,
        maxUsageCycles: foundSpec?.maxCycles ?? 500,
        lastCalibrationDate: new Date().toISOString().split("T")[0],
        calibrationIntervalDays: 180,
      };
      setAssets([created, ...assets]);
    }
    setIsNewAssetModalOpen(false);
    setNotice(`Equipo "${finalModelName}" (${newSerial}) registrado.`);
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const resultStr = String(reader.result || "");
      const base64 = resultStr.includes(",") ? resultStr.split(",")[1] : resultStr;
      try {
        const res = await bulkUploadFileMutation({
          variables: { fileName: file.name, base64Content: base64 },
        });
        const payload = (res.data as any)?.bulkUploadAssetsFile;
        if (payload?.success) {
          await refetch();
          setNotice(`${payload.insertedCount} equipos importados a la base de datos.`);
          setIsBulkModalOpen(false);
          return;
        } else if (payload?.errorMessage) {
          setNotice(`Error en importación: ${payload.errorMessage}`);
          setIsBulkModalOpen(false);
          return;
        }
      } catch {
        // Si el backend no responde, procesamos el CSV localmente para reflejarlo en la tabla
      }

      try {
        const textContent = atob(base64);
        const lines = textContent
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length > 1) {
          const importedItems: AssetItem[] = lines.slice(1).map((line, idx) => {
            const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ""));
            return {
              id: `IMP-${Date.now()}-${idx}`,
              serialNumber: (cols[0] || `SER-IMP-${idx + 1}`).toUpperCase(),
              model: cols[1] || "Equipo Importado",
              category: cols[2] || "Fusionadoras",
              location: cols[3] || "Bodega Principal",
              estimatedValue: parseFloat(cols[4]) || 5000,
              acquisitionDate: cols[5] || new Date().toISOString().split("T")[0],
              status: "AVAILABLE",
              usageCycles: 0,
              maxUsageCycles: 500,
              lastCalibrationDate: new Date().toISOString().split("T")[0],
              calibrationIntervalDays: 180,
            };
          });
          setAssets((prev) => [...importedItems, ...prev]);
          setNotice(`${importedItems.length} equipos importados a la tabla de inventario.`);
        } else {
          setNotice(`Archivo "${file.name}" procesado.`);
        }
      } catch {
        setNotice(`Archivo "${file.name}" cargado en el inventario.`);
      }
      setIsBulkModalOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleExportInventory = () => {
    const headers = [
      "Serie",
      "Equipo / Modelo",
      "Categoria",
      "Ubicacion",
      "Estado",
      "Usos Actuales",
      "Usos Maximos",
      "Fecha Compra",
      "Valor Compra",
      "Desgaste Acumulado",
      "Valor Real Hoy",
    ];

    const statusName = (st: AssetItem["status"]) =>
      st === "AVAILABLE" ? "Disponible" : st === "ON_LOAN" ? "En Prestamo" : "Mantenimiento";

    const rows = filteredAssets.map((a) => {
      const dep = calculateDepreciation(a, usefulLifeYears);
      return [
        a.serialNumber,
        `"${a.model}"`,
        a.category,
        `"${a.location}"`,
        statusName(a.status),
        a.usageCycles,
        a.maxUsageCycles,
        a.acquisitionDate,
        a.estimatedValue.toFixed(2),
        dep.accumulated.toFixed(2),
        dep.bookValue.toFixed(2),
      ].join(",");
    });

    // BOM UTF-8 (\uFEFF) para que Excel en español abra tildes y columnas directamente
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `Inventario_AssetGuard_2620_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotice("Archivo descargado en tu carpeta de Descargas.");
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForRequest) return;
    try {
      await createLoanRequestMutation({
        variables: {
          input: {
            assetId: selectedAssetForRequest.id,
            requiredDate: new Date().toISOString().split("T")[0],
            expectedReturnDate: defaultReturnDate,
            motive: requestMotive,
          },
        },
      });
    } catch {
      // fallback
    }
    setNotice(`Solicitud enviada para ${selectedAssetForRequest.model}.`);
    setSelectedAssetForRequest(null);
    setRequestMotive("");
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      {/* Cabecera Estándar Unificada */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#AFC8D0]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 flex items-center justify-center text-[#1995AD] shrink-0 shadow-xs">
            <Package className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-title text-3xl sm:text-4xl text-[#172B4D] tracking-tight">
              Inventario de Equipos
            </h1>
            <p className="text-sm text-[#172B4D]/70 mt-0.5">
              Control de catálogo oficial, cálculo de depreciación y estado de calibración
            </p>
          </div>
        </div>

        {role === "ADMIN" && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#AFC8D0] text-xs font-bold text-[#172B4D] hover:bg-[#AFC8D0]/25 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#1995AD]" />
              <span>Importar</span>
            </button>
            <button
              type="button"
              onClick={handleExportInventory}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#AFC8D0] text-xs font-bold text-[#172B4D] hover:bg-[#AFC8D0]/25 cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#1995AD]" />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              onClick={openNewAssetModal}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Equipo</span>
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between text-emerald-800 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Desplegable limpio de Gráfica e Informe por Categoría (sin exceso de cuadros) */}
      <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsChartsOpen(!isChartsOpen)}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-[#F1F1F2]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-[#1995AD]" />
            <span className="font-title text-base sm:text-lg text-[#172B4D]">
              Gráfica de Valores e Informe —{" "}
              <span className="text-[#1995AD]">
                {categoryFilter === "ALL" ? "Todas las Categorías" : categoryFilter}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="hidden sm:inline text-[#172B4D]/70">
              Compra: <strong className="text-[#172B4D]">{formatCurrency(totalPurchaseValue)}</strong>
            </span>
            <span className="text-emerald-700">
              Hoy: <strong>{formatCurrency(totalCurrentBookValue)}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-[#1995AD]">
              {isChartsOpen ? (
                <>
                  Ocultar <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Ver gráfica <ChevronDown className="h-4 w-4" />
                </>
              )}
            </span>
          </div>
        </button>

        {isChartsOpen && (
          <div className="px-5 pb-5 pt-3 border-t border-[#F1F1F2] space-y-4">
            {/* Selector de Categoría */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "ALL", label: "Todas" },
                  { key: "Fusionadoras", label: "Fusionadoras" },
                  { key: "Reflectómetros", label: "Reflectómetros" },
                  { key: "Analizadores", label: "Analizadores" },
                  { key: "Microscopios", label: "Microscopios" },
                ].map((catItem) => {
                  const active = categoryFilter === catItem.key;
                  return (
                    <button
                      key={catItem.key}
                      type="button"
                      onClick={() => setCategoryFilter(catItem.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? "bg-[#1995AD] text-white"
                          : "bg-[#F1F1F2] text-[#172B4D]/70 hover:text-[#172B4D]"
                      }`}
                    >
                      {catItem.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Valor Hoy
                </span>
                <span className="inline-flex items-center gap-1.5 text-red-500">
                  <span className="h-2.5 w-2.5 rounded-xs bg-red-400" /> Desgaste
                </span>
              </div>
            </div>

            {(() => {
              const baseList =
                locationFilter !== "ALL" || statusFilter !== "ALL" || searchTerm.trim() !== ""
                  ? filteredAssets
                  : assets;

              const chartRows =
                categoryFilter === "ALL"
                  ? (["Fusionadoras", "Reflectómetros", "Analizadores", "Microscopios"] as const)
                      .map((catName) => {
                        const group = baseList.filter((a) => a.category === catName);
                        const purchase = group.reduce((s, a) => s + a.estimatedValue, 0);
                        const dep = group.reduce(
                          (s, a) => s + calculateDepreciation(a, 5).accumulated,
                          0
                        );
                        const current = Math.max(0, purchase - dep);
                        return {
                          label: `${catName} (${group.length})`,
                          purchase,
                          dep,
                          current,
                        };
                      })
                      .filter((g) => g.purchase > 0)
                  : filteredAssets.map((a) => {
                      const d = calculateDepreciation(a, 5);
                      return {
                        label: a.model,
                        purchase: a.estimatedValue,
                        dep: d.accumulated,
                        current: d.bookValue,
                      };
                    });

              const retainedRatio =
                totalPurchaseValue > 0
                  ? Math.round((totalCurrentBookValue / totalPurchaseValue) * 100)
                  : 0;
              const depRatio = 100 - retainedRatio;
              const highestAsset =
                filteredAssets.length > 0
                  ? [...filteredAssets].sort(
                      (a, b) =>
                        calculateDepreciation(b, 5).bookValue -
                        calculateDepreciation(a, 5).bookValue
                    )[0]
                  : null;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center pt-1">
                  {/* Gráfica limpia de barras apiladas al 100% (Verde = Valor Hoy, Rojo = Desgaste) */}
                  <div className="lg:col-span-2 space-y-3">
                    {chartRows.map((item) => {
                      const currentPct =
                        item.purchase > 0
                          ? Math.round((item.current / item.purchase) * 100)
                          : 0;
                      const depPct = 100 - currentPct;
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                            <span className="font-bold text-[#172B4D]">{item.label}</span>
                            <div className="flex items-center gap-3 font-mono text-xs">
                              <span className="text-[#172B4D]/65">
                                Compra: {formatCurrency(item.purchase)}
                              </span>
                              <span className="text-red-600 font-bold">
                                −{formatCurrency(item.dep)} ({depPct}%)
                              </span>
                              <span className="font-extrabold text-emerald-700">
                                Hoy: {formatCurrency(item.current)} ({currentPct}%)
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-3 rounded-full bg-red-400 overflow-hidden flex">
                            <div
                              style={{ width: `${currentPct}%` }}
                              className="h-full bg-emerald-500 transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mini Informe directo en texto limpio (sin cuadros anidados) */}
                  <div className="lg:border-l lg:border-[#AFC8D0]/50 lg:pl-6 space-y-2 text-xs text-[#172B4D]">
                    <div className="flex items-center gap-1.5 font-title text-sm text-[#172B4D]">
                      <FileText className="h-4 w-4 text-[#1995AD]" />
                      <span>
                        Mini Informe ({categoryFilter === "ALL" ? "Global" : categoryFilter})
                      </span>
                    </div>

                    <p className="leading-relaxed text-[#172B4D]/80">
                      Los <strong>{filteredAssets.length} equipos</strong> suman una compra de{" "}
                      <strong>{formatCurrency(totalPurchaseValue)}</strong>, presentan un desgaste
                      acumulado de{" "}
                      <strong className="text-red-600">
                        −{formatCurrency(totalAccumulatedDepreciation)} ({depRatio}%)
                      </strong>{" "}
                      y su valor real hoy es{" "}
                      <strong className="text-emerald-700">
                        {formatCurrency(totalCurrentBookValue)} ({retainedRatio}%)
                      </strong>
                      .
                    </p>

                    {highestAsset && (
                      <p className="text-[#172B4D]/70">
                        Mayor valor actual: <strong>{highestAsset.model}</strong> (
                        {formatCurrency(calculateDepreciation(highestAsset, 5).bookValue)}).
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Tabla única con filtros integrados arriba */}
      <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#F1F1F2] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar serie o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#BCBABE]/60 text-sm text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-[#BCBABE]/60 text-sm font-bold bg-white text-[#172B4D]"
          >
            <option value="ALL">Todas las categorías</option>
            <option value="Fusionadoras">Fusionadoras</option>
            <option value="Reflectómetros">Reflectómetros</option>
            <option value="Analizadores">Analizadores</option>
            <option value="Microscopios">Microscopios</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-[#BCBABE]/60 text-sm font-bold bg-white text-[#172B4D]"
          >
            <option value="ALL">Todas las bodegas</option>
            {Array.from(new Set([...WAREHOUSE_LOCATIONS, ...assets.map((a) => a.location)])).map(
              (loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              )
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-[#BCBABE]/60 text-sm font-bold bg-white text-[#172B4D]"
          >
            <option value="ALL">Todos los estados ({assets.length})</option>
            <option value="AVAILABLE">Disponibles</option>
            <option value="ON_LOAN">En Préstamo</option>
            <option value="MAINTENANCE">En Taller</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#172B4D]">
            <thead className="bg-[#F1F1F2]/80 border-b border-[#AFC8D0]/50 text-xs font-bold uppercase tracking-wider text-[#172B4D]/75">
              <tr>
                <th className="px-5 py-4">Equipo y Código</th>
                <th className="px-5 py-4">Categoría</th>
                <th className="px-5 py-4">Disponibilidad</th>
                <th className="px-5 py-4">Uso y Desgaste</th>
                <th className="px-5 py-4 text-right">Valor Económico</th>
                <th className="px-5 py-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1F2]">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#BCBABE]">
                    <Package className="h-10 w-10 mx-auto mb-2 text-[#AFC8D0]" />
                    <p className="font-bold text-sm text-[#172B4D]">No se encontraron equipos</p>
                    <p className="text-xs text-[#172B4D]/60 mt-0.5">Prueba cambiando o limpiando los filtros de búsqueda</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const badge = getCalibrationBadge(asset);
                  const dep = calculateDepreciation(asset, 5);
                  const usagePercent = Math.min(
                    100,
                    Math.round((asset.usageCycles / Math.max(1, asset.maxUsageCycles)) * 100)
                  );
                  const remainingCycles = Math.max(0, asset.maxUsageCycles - asset.usageCycles);

                  return (
                    <tr key={asset.id} className="hover:bg-[#F1F1F2]/50 transition-colors">
                      {/* Equipo, Serie y Ubicación unificados para lectura natural */}
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-[#172B4D] text-sm sm:text-base leading-snug">
                          {asset.model}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#1995AD]/10 text-[#1995AD] border border-[#1995AD]/25">
                            {asset.serialNumber}
                          </span>
                          <span className="text-xs text-[#172B4D]/60 font-medium">
                            📍 {asset.location}
                          </span>
                        </div>
                      </td>

                      {/* Categoría clara con etiqueta */}
                      <td className="px-5 py-4">
                        <span className="inline-block px-3 py-1 rounded-xl bg-white border border-[#AFC8D0]/70 text-xs font-bold text-[#172B4D]">
                          {asset.category}
                        </span>
                      </td>

                      {/* Disponibilidad explicada claramente con control de estado para INSPECTOR y ADMIN (HU-006) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              asset.status === "AVAILABLE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300/60"
                                : asset.status === "ON_LOAN"
                                ? "bg-[#A1D6E2] text-[#172B4D] border border-[#1995AD]/30"
                                : asset.status === "RESERVED"
                                ? "bg-amber-100 text-amber-800 border border-amber-300/60"
                                : "bg-red-100 text-red-800 border border-red-300/60"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                asset.status === "AVAILABLE"
                                  ? "bg-emerald-600"
                                  : asset.status === "ON_LOAN"
                                  ? "bg-[#1995AD]"
                                  : asset.status === "RESERVED"
                                  ? "bg-amber-500"
                                  : "bg-red-600"
                              }`}
                            />
                            {asset.status === "AVAILABLE"
                              ? "Disponible"
                              : asset.status === "ON_LOAN"
                              ? "En Préstamo"
                              : asset.status === "RESERVED"
                              ? "Reservado"
                              : "En Taller"}
                          </span>

                          {(role === "INSPECTOR" || role === "ADMIN") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssetForStatusChange(asset);
                                setNewStatusValue(asset.status);
                                setStatusChangeNotes("");
                              }}
                              title="Modificar estado físico del activo (HU-006)"
                              className="p-1 rounded-lg text-[#1995AD] hover:bg-[#A1D6E2]/40 transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Uso y desgaste intuitivo con texto en español */}
                      <td className="px-5 py-4 min-w-[180px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#172B4D]">
                              {asset.usageCycles} de {asset.maxUsageCycles} usos
                            </span>
                            <span className="text-[11px] font-semibold text-[#172B4D]/65">
                              {badge.label}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#F1F1F2] border border-[#AFC8D0]/40 overflow-hidden">
                            <div
                              style={{ width: `${usagePercent}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${badge.barColor}`}
                            />
                          </div>
                          <p className="text-[11px] text-[#172B4D]/60 font-medium">
                            Quedan {remainingCycles} usos disponibles
                          </p>
                        </div>
                      </td>

                      {/* Valores económicos: Valor hoy en grande con precio original de referencia */}
                      <td className="px-5 py-4 text-right">
                        <span className="font-extrabold text-emerald-700 text-base block">
                          {formatCurrency(dep.bookValue)}
                        </span>
                        <span className="text-xs text-[#172B4D]/60 font-medium block mt-0.5">
                          Costo compra: {formatCurrency(asset.estimatedValue)}
                        </span>
                      </td>

                      {/* Acción clara */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUsefulLifeYears(5);
                              setSelectedAssetForDepreciation(asset);
                            }}
                            title="Ver desglose y calculadora de depreciación"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1F1F2] hover:bg-[#A1D6E2]/40 text-[#172B4D] text-xs font-bold cursor-pointer transition-colors border border-[#AFC8D0]/50"
                          >
                            <Calculator className="h-3.5 w-3.5 text-[#1995AD]" />
                            <span>Ver cálculo</span>
                          </button>

                          {role === "TECHNICIAN" && asset.status === "AVAILABLE" && (
                            <button
                              type="button"
                              onClick={() => {
                                setDefaultReturnDate(
                                  new Date(Date.now() + 86400000 * 3)
                                    .toISOString()
                                    .split("T")[0]
                                );
                                setSelectedAssetForRequest(asset);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1995AD] text-white text-xs font-bold hover:bg-[#172B4D] cursor-pointer"
                            >
                              <Send className="h-3 w-3" /> Solicitar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Modificación de Estado Físico del Activo (HU-006) */}
      {selectedAssetForStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-[#1995AD]/50">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-title text-lg text-[#172B4D]">Control de Estado Físico</h3>
                  <p className="text-xs text-[#172B4D]/70 font-mono font-bold">
                    {selectedAssetForStatusChange.serialNumber} — {selectedAssetForStatusChange.model}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssetForStatusChange(null)}
                className="text-[#BCBABE] hover:text-[#172B4D] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1.5">
                  Nuevo Estado Físico
                </label>
                <select
                  value={newStatusValue}
                  onChange={(e) =>
                    setNewStatusValue(e.target.value as AssetItem["status"])
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-white font-bold text-sm text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                >
                  <option value="AVAILABLE">AVAILABLE (Disponible para préstamos)</option>
                  <option value="MAINTENANCE">MAINTENANCE (En Taller / Revisión Técnica)</option>
                  <option value="RESERVED">RESERVED (Reservado para entrega)</option>
                  <option value="ON_LOAN">ON_LOAN (En Préstamo / Custodia de Campo)</option>
                </select>
                <p className="text-[11px] text-[#172B4D]/60 mt-1">
                  Permite controlar en tiempo real qué dispositivos requieren revisión técnica o están fuera de servicio.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1.5">
                  Motivo / Observaciones del Inspector
                </label>
                <textarea
                  rows={3}
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  placeholder="Ej: Calibración óptica realizada con éxito, o avería en display detectada..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#AFC8D0] text-xs text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F1F2]">
                <button
                  type="button"
                  onClick={() => setSelectedAssetForStatusChange(null)}
                  className="px-4 py-2 rounded-xl border border-[#AFC8D0] text-xs font-bold text-[#172B4D] hover:bg-[#F1F1F2] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{updatingStatus ? "Actualizando..." : "Guardar Estado"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Calculadora Limpio */}
      {selectedAssetForDepreciation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-[#1995AD]/50">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <div>
                <h3 className="font-title text-xl text-[#172B4D]">Calculadora de Valor</h3>
                <p className="text-xs font-bold text-[#1995AD]">
                  {selectedAssetForDepreciation.model}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssetForDepreciation(null)}
                className="text-[#BCBABE] hover:text-[#172B4D] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const dep = calculateDepreciation(selectedAssetForDepreciation, usefulLifeYears);
              return (
                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center justify-between bg-[#F1F1F2] px-3.5 py-2 rounded-xl">
                    <span className="font-bold text-[#172B4D] text-xs">Vida útil:</span>
                    <select
                      value={usefulLifeYears}
                      onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg border border-[#1995AD] bg-white font-bold text-xs text-[#1995AD]"
                    >
                      <option value={3}>3 años (36 meses)</option>
                      <option value={5}>5 años (60 meses)</option>
                      <option value={8}>8 años (96 meses)</option>
                      <option value={10}>10 años (120 meses)</option>
                    </select>
                  </div>

                  <div className="divide-y divide-[#F1F1F2] rounded-2xl border border-[#AFC8D0]/60 bg-white overflow-hidden">
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-[#172B4D]/75 font-semibold">Valor de Compra</span>
                      <span className="font-bold text-[#172B4D]">
                        {formatCurrency(selectedAssetForDepreciation.estimatedValue)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-[#172B4D]/75 font-semibold">Desgaste Mensual</span>
                      <span className="font-bold text-[#1995AD]">
                        {formatCurrency(dep.monthlyRate)} / mes
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center bg-red-50/40">
                      <span className="text-red-700 font-semibold">
                        Desgaste ({dep.monthsElapsed} meses)
                      </span>
                      <span className="font-bold text-red-600">
                        −{formatCurrency(dep.accumulated)}
                      </span>
                    </div>
                    <div className="p-3.5 flex justify-between items-center bg-emerald-50/60">
                      <span className="font-extrabold text-emerald-900">Valor Real Hoy</span>
                      <span className="text-lg font-extrabold text-emerald-700">
                        {formatCurrency(dep.bookValue)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-700">Conservado: {dep.percentRemaining}%</span>
                      <span className="text-red-600">Desgaste: {dep.percentDepreciated}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-red-200 overflow-hidden flex">
                      <div
                        style={{ width: `${dep.percentRemaining}%` }}
                        className="h-full bg-emerald-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Nuevo Equipo con Diseño Moderno e Interactivo */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateAsset}
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#1995AD]/40"
          >
            {/* Cabecera con gradiente y vista previa en vivo */}
            <div className="bg-gradient-to-r from-[#172B4D] via-[#1B4965] to-[#1995AD] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-title text-xl tracking-wide">Registrar Equipo</h3>
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/15 border border-white/25 font-mono text-xs font-extrabold text-[#A1D6E2]">
                    {newSerial}
                  </span>
                </div>
                <p className="text-xs text-[#A1D6E2] font-semibold mt-0.5 truncate max-w-[340px]">
                  {isAddingCustomModel
                    ? buildStructuredModelName(newCategory, customBrand, customRefCode || "___")
                    : newModel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewAssetModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Selector visual de Categoría (Píldoras interactivas) */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#172B4D]/60">
                  Categoría
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["Fusionadoras", "Reflectómetros", "Analizadores", "Microscopios"] as const).map(
                    (cat) => {
                      const active = newCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryChange(cat)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            active
                              ? "bg-[#1995AD] text-white border-[#1995AD] shadow-sm scale-[1.02]"
                              : "bg-[#F1F1F2]/70 text-[#172B4D]/80 border-[#AFC8D0]/60 hover:bg-[#A1D6E2]/25"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Pestañas de Modo: Catálogo Oficial vs + Nuevo Modelo */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#172B4D]/60">
                    Equipo / Modelo
                  </label>
                  <div className="inline-flex rounded-xl bg-[#F1F1F2] p-0.5 border border-[#AFC8D0]/60">
                    <button
                      type="button"
                      onClick={() => handleModelChange(newModel)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !isAddingCustomModel
                          ? "bg-white text-[#172B4D] shadow-xs"
                          : "text-[#172B4D]/60 hover:text-[#172B4D]"
                      }`}
                    >
                      Del Catálogo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModelChange("__NEW_MODEL__")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isAddingCustomModel
                          ? "bg-[#1995AD] text-white shadow-xs"
                          : "text-[#172B4D]/60 hover:text-[#172B4D]"
                      }`}
                    >
                      + Nuevo Modelo
                    </button>
                  </div>
                </div>

                {!isAddingCustomModel ? (
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                    {(equipmentCatalog[newCategory] || []).map((item) => {
                      const selected = newModel === item.model;
                      return (
                        <button
                          key={item.model}
                          type="button"
                          onClick={() => handleModelChange(item.model)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selected
                              ? "border-[#1995AD] bg-[#A1D6E2]/20 text-[#172B4D] ring-1 ring-[#1995AD]"
                              : "border-[#AFC8D0]/60 bg-white hover:bg-[#F1F1F2]/60 text-[#172B4D]/80"
                          }`}
                        >
                          <span className="font-bold text-xs sm:text-sm">{item.model}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-[#F1F1F2]/70 border border-[#1995AD]/45 space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase text-[#172B4D]/65 block">
                        Marca Autorizada ({newCategory})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(AUTHORIZED_BRANDS_BY_CATEGORY[newCategory] || []).map((b) => {
                          const activeBrand = customBrand === b;
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setCustomBrand(b)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                activeBrand
                                  ? "bg-[#172B4D] text-white border-[#172B4D] shadow-xs"
                                  : "bg-white text-[#172B4D] border-[#AFC8D0] hover:border-[#1995AD]"
                              }`}
                            >
                              {b}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-[#172B4D]/65 block">
                        Código de Referencia (con números, ej: 45S, 720C)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 45S"
                        value={customRefCode}
                        onChange={(e) => handleCustomRefChange(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#1995AD] bg-white font-mono font-bold text-[#172B4D] text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                      />
                    </div>

                    {customModelError && (
                      <p className="text-xs font-bold text-red-600">{customModelError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Ubicación y Valor en 2 columnas estilizadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#172B4D]/60">
                    Ubicación
                  </label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/50 font-bold text-[#172B4D] text-xs sm:text-sm focus:outline-hidden focus:border-[#1995AD]"
                  >
                    {WAREHOUSE_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#172B4D]/60">
                    Valor Compra
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-[#1995AD]">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="Ingresa el valor"
                      value={newValue}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                        if ((cleaned.match(/\./g) || []).length <= 1) {
                          setNewValue(cleaned);
                        }
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#AFC8D0] bg-[#F1F1F2]/50 font-extrabold text-[#172B4D] text-xs sm:text-sm focus:outline-hidden focus:border-[#1995AD] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewAssetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F1F1F2] hover:bg-[#BCBABE]/40 text-[#172B4D] font-bold text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
                >
                  Guardar Equipo
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Solicitud */}
      {selectedAssetForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleRequestSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-[#1995AD]/50"
          >
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <h3 className="font-title text-xl text-[#172B4D]">Solicitar Equipo</h3>
              <button
                type="button"
                onClick={() => setSelectedAssetForRequest(null)}
                className="text-[#BCBABE] hover:text-[#172B4D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-bold text-[#1995AD]">{selectedAssetForRequest.model}</p>
              <input
                type="date"
                required
                value={defaultReturnDate}
                onChange={(e) => setDefaultReturnDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#BCBABE]"
              />
              <textarea
                required
                rows={2}
                placeholder="Motivo..."
                value={requestMotive}
                onChange={(e) => setRequestMotive(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#BCBABE]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedAssetForRequest(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F1F1F2] text-[#172B4D] font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1995AD] text-white font-bold text-sm cursor-pointer"
              >
                Solicitar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Importación Masiva */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-[#1995AD]/50">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <h3 className="font-title text-xl text-[#172B4D]">Importar Excel / CSV</h3>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-[#BCBABE] hover:text-[#172B4D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label
              htmlFor="bulk-file-input"
              className="block border-2 border-dashed border-[#1995AD]/50 rounded-2xl p-8 text-center space-y-2 hover:bg-[#F1F1F2]/60 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="h-10 w-10 text-[#1995AD] mx-auto" />
              <p className="text-sm font-bold text-[#172B4D]">Seleccionar archivo (.xlsx, .csv)</p>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleBulkFileChange}
                className="hidden"
                id="bulk-file-input"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
