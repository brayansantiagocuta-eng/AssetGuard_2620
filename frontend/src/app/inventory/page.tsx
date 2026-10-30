"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@/context/AuthContext";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
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
  MapPin,
  Building,
  TrendingUp,
  QrCode,
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
  qrCode?: string | null;
}

const STORAGE_KEY_REGISTERED = "assetguard_registered_assets";

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
    serialNumber: "OTDR-730C-002",
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
    serialNumber: "ANAL-ONX580-003",
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
    serialNumber: "MIC-FIP435-004",
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
    serialNumber: "FUS-VIEW7-007",
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
    serialNumber: "ANAL-DSX8000-012",
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
    serialNumber: "ANAL-MS2090-013",
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
    serialNumber: "MIC-P5000I-014",
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
    serialNumber: "MIC-FI7000-015",
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

const WAREHOUSE_LOCATIONS = [
  "Bodega Principal - A1",
  "Bodega Principal - A2",
  "Bodega Principal - B2",
  "Bodega Principal - C1",
  "Laboratorio",
];

const CATEGORY_PREFIX: Record<string, string> = {
  Fusionadoras: "FUS",
  Reflectómetros: "OTDR",
  Analizadores: "ANAL",
  Microscopios: "MIC",
};

const SERIAL_ALIASES: Record<string, string> = {
  "OTDR-MAX-730C-002": "OTDR-730C-002",
  "ANAL-VIAVI-ONX-003": "ANAL-ONX580-003",
  "PWR-FIP-435B-004": "MIC-FIP435-004",
  "FUS-INNO-V7-007": "FUS-VIEW7-007",
  "ANAL-FLK-DSX-012": "ANAL-DSX8000-012",
  "ANAL-ANR-MS20-013": "ANAL-MS2090-013",
  "PWR-P5000I-014": "MIC-P5000I-014",
  "PWR-FLK-FI7000-015": "MIC-FI7000-015",
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

export default function InventoryPage() {
  const { role } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>(() => {
    if (typeof window === "undefined") return INITIAL_ASSETS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REGISTERED);
      if (saved) {
        const custom: AssetItem[] = JSON.parse(saved);
        if (Array.isArray(custom) && custom.length > 0) {
          const customSerials = new Set(custom.map((x) => x.serialNumber.toUpperCase()));
          return [
            ...custom,
            ...INITIAL_ASSETS.filter((a) => !customSerials.has(a.serialNumber.toUpperCase())),
          ];
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ASSETS;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isChartsOpen, setIsChartsOpen] = useState<boolean>(false);

  const categoryOptions: SelectOption[] = [
    { value: "ALL", label: "Todas las categorías" },
    { value: "Fusionadoras", label: "Fusionadoras" },
    { value: "Reflectómetros", label: "Reflectómetros" },
    { value: "Analizadores", label: "Analizadores" },
    { value: "Microscopios", label: "Microscopios" },
  ];

  const locationOptions: SelectOption[] = useMemo(
    () => [
      { value: "ALL", label: "Todas las bodegas" },
      ...Array.from(new Set([...WAREHOUSE_LOCATIONS, ...assets.map((a) => a.location)])).map(
        (loc) => ({
          value: loc,
          label: loc,
        })
      ),
    ],
    [assets]
  );

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { value: "ALL", label: `Todos los estados (${assets.length})` },
      { value: "AVAILABLE", label: "Disponibles" },
      { value: "ON_LOAN", label: "En Préstamo" },
      { value: "MAINTENANCE", label: "En Taller" },
    ],
    [assets.length]
  );

  const statusChangeOptions: SelectOption[] = [
    { value: "AVAILABLE", label: "AVAILABLE (Disponible para préstamos)" },
    { value: "MAINTENANCE", label: "MAINTENANCE (En Taller / Revisión Técnica)" },
    { value: "RESERVED", label: "RESERVED (Reservado para entrega)" },
    { value: "ON_LOAN", label: "ON_LOAN (En Préstamo / Custodia de Campo)" },
  ];

  const usefulLifeOptions: SelectOption[] = [
    { value: "3", label: "3 años (36 meses)" },
    { value: "5", label: "5 años (60 meses)" },
    { value: "8", label: "8 años (96 meses)" },
    { value: "10", label: "10 años (120 meses)" },
  ];

  const warehouseSelectOptions: SelectOption[] = useMemo(
    () => WAREHOUSE_LOCATIONS.map((loc) => ({ value: loc, label: loc })),
    []
  );
  const [selectedAssetForDepreciation, setSelectedAssetForDepreciation] =
    useState<AssetItem | null>(null);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(5);
  const [selectedAssetForRequest, setSelectedAssetForRequest] = useState<AssetItem | null>(null);
  const [selectedAssetForStatusChange, setSelectedAssetForStatusChange] = useState<AssetItem | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<"AVAILABLE" | "ON_LOAN" | "MAINTENANCE" | "RESERVED">("AVAILABLE");
  const [statusChangeNotes, setStatusChangeNotes] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [isNewAssetOpen, setIsNewAssetOpen] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const [isLocationSelectOpen, setIsLocationSelectOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Modal scroll refs to ensure mouse wheel moves contents smoothly
  const statusModalBodyRef = useRef<HTMLDivElement>(null);
  const depModalBodyRef = useRef<HTMLDivElement>(null);
  const requestModalBodyRef = useRef<HTMLDivElement>(null);

  // Bloquea el scroll de la página de fondo mientras el desplegable o cualquier modal esté abierto
  useEffect(() => {
    const hasModalOpen =
      isNewAssetOpen ||
      !!selectedAssetForStatusChange ||
      !!selectedAssetForDepreciation ||
      !!selectedAssetForRequest ||
      isBulkModalOpen;

    if (hasModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    isNewAssetOpen,
    selectedAssetForStatusChange,
    selectedAssetForDepreciation,
    selectedAssetForRequest,
    isBulkModalOpen,
  ]);

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
      const extraDbAssets: AssetItem[] = [];

      for (const a of assetsData.assets.items) {
        const rawKey = String(a.serialNumber || "").toUpperCase();
        const key = SERIAL_ALIASES[rawKey] || rawKey;
        if (officialBySerial.has(key)) {
          dbBySerial.set(key, a);
        } else {
          extraDbAssets.push({
            id: String(a.id),
            serialNumber: a.serialNumber,
            model: a.model || "Equipo Telecom",
            category: a.category?.name || "Fusionadoras",
            location: a.location?.name || "Bodega Principal - A1",
            estimatedValue: Number(a.estimatedValue) || 0,
            acquisitionDate: a.acquisitionDate || new Date().toISOString().split("T")[0],
            status: normalizeStatus(a.status),
            usageCycles: Number(a.usageCycles) || 0,
            maxUsageCycles: Number(a.maxUsageCycles) || 500,
            lastCalibrationDate: a.lastCalibrationDate || new Date().toISOString().split("T")[0],
            calibrationIntervalDays: Number(a.calibrationIntervalDays) || 180,
            qrCode: a.qrCode || `QR-${a.serialNumber}`,
          });
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
          qrCode: dbMatch.qrCode || baseItem.qrCode,
        };
      });

      // Leer también los equipos creados guardados en el almacenamiento local persistente
      let localCustom: AssetItem[] = [];
      try {
        const saved = localStorage.getItem(STORAGE_KEY_REGISTERED);
        if (saved) localCustom = JSON.parse(saved);
      } catch {
        // ignore
      }

      // Combinar los equipos creados + oficiales garantizando que no se repitan por serial ni por id
      const seenSerials = new Set<string>();
      const seenIds = new Set<string>();
      const allMerged: AssetItem[] = [];

      // 1. Equipos nuevos creados (locales y de BD) primero para que aparezcan en la parte superior
      for (const item of [...localCustom, ...extraDbAssets]) {
        const s = item.serialNumber.toUpperCase();
        if (!seenSerials.has(s)) {
          seenSerials.add(s);
          const safeId = String(item.id);
          seenIds.add(safeId);
          allMerged.push({ ...item, id: safeId });
        }
      }

      // 2. Equipos oficiales de base
      for (const item of mergedOfficial) {
        const s = item.serialNumber.toUpperCase();
        if (!seenSerials.has(s)) {
          seenSerials.add(s);
          let safeId = String(item.id);
          if (seenIds.has(safeId)) {
            safeId = `base-${item.id}-${item.serialNumber}`;
          }
          seenIds.add(safeId);
          allMerged.push({ ...item, id: safeId });
        }
      }

      setAssets(allMerged);
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
        model: "Fusionadora de Fibra Sumitomo T-72C",
        serialPrefix: "FUS-T72C",
        defaultPrice: 7800,
        maxCycles: 900,
      },
      {
        model: "Fusionadora de Fibra Fujikura 70S",
        serialPrefix: "FUS-70S",
        defaultPrice: 6200,
        maxCycles: 800,
      },
      {
        model: "Fusionadora de Fibra INNO View 7",
        serialPrefix: "FUS-VIEW7",
        defaultPrice: 5400,
        maxCycles: 800,
      },
      {
        model: "Fusionadora de Fibra FITEL S179",
        serialPrefix: "FUS-S179",
        defaultPrice: 5900,
        maxCycles: 850,
      },
      {
        model: "Fusionadora de Fibra Fujikura 45S",
        serialPrefix: "FUS-45S",
        defaultPrice: 4300,
        maxCycles: 700,
      },
      {
        model: "Fusionadora de Fibra Sumitomo T-57",
        serialPrefix: "FUS-T57",
        defaultPrice: 6600,
        maxCycles: 800,
      },
    ],
    Reflectómetros: [
      {
        model: "Reflectómetro Óptico EXFO 730C",
        serialPrefix: "OTDR-730C",
        defaultPrice: 12000,
        maxCycles: 500,
      },
      {
        model: "Reflectómetro Óptico Viavi SmartOTDR",
        serialPrefix: "OTDR-SMART",
        defaultPrice: 9500,
        maxCycles: 500,
      },
      {
        model: "Reflectómetro Óptico Anritsu MT9085",
        serialPrefix: "OTDR-MT9085",
        defaultPrice: 10500,
        maxCycles: 500,
      },
      {
        model: "Reflectómetro Óptico Yokogawa AQ7280",
        serialPrefix: "OTDR-AQ7280",
        defaultPrice: 11200,
        maxCycles: 600,
      },
      {
        model: "Reflectómetro Óptico EXFO MaxTester 720C",
        serialPrefix: "OTDR-720C",
        defaultPrice: 8900,
        maxCycles: 500,
      },
      {
        model: "Reflectómetro Óptico Viavi T-BERD 2000",
        serialPrefix: "OTDR-TBERD2K",
        defaultPrice: 9800,
        maxCycles: 550,
      },
    ],
    Analizadores: [
      {
        model: "Analizador de Red Viavi ONX-580",
        serialPrefix: "ANAL-ONX580",
        defaultPrice: 9200,
        maxCycles: 500,
      },
      {
        model: "Analizador de Espectro EXFO FTB-1",
        serialPrefix: "ANAL-FTB1",
        defaultPrice: 11400,
        maxCycles: 600,
      },
      {
        model: "Analizador de Red Fluke DSX-8000",
        serialPrefix: "ANAL-DSX8000",
        defaultPrice: 13500,
        maxCycles: 600,
      },
      {
        model: "Analizador de Transmisión VeEX FX150+",
        serialPrefix: "ANAL-FX150",
        defaultPrice: 8700,
        maxCycles: 450,
      },
      {
        model: "Analizador Ethernet EXFO NetBlazer V2",
        serialPrefix: "ANAL-NETBLAZER",
        defaultPrice: 10200,
        maxCycles: 500,
      },
      {
        model: "Analizador Óptico Viavi MTS-4000",
        serialPrefix: "ANAL-MTS4000",
        defaultPrice: 9900,
        maxCycles: 550,
      },
    ],
    Microscopios: [
      {
        model: "Sonda de Inspección Óptica EXFO",
        serialPrefix: "MIC-FIP435",
        defaultPrice: 3100,
        maxCycles: 400,
      },
      {
        model: "Microscopio Digital de Fibra Viavi P5000i",
        serialPrefix: "MIC-P5000I",
        defaultPrice: 2800,
        maxCycles: 400,
      },
      {
        model: "Microscopio de Inspección Fluke FiberInspector Pro",
        serialPrefix: "MIC-FI7000",
        defaultPrice: 3400,
        maxCycles: 450,
      },
      {
        model: "Sonda Inalámbrica de Conectores EXFO FIP-500",
        serialPrefix: "MIC-FIP500",
        defaultPrice: 3900,
        maxCycles: 500,
      },
      {
        model: "Microscopio de Mano Viavi FiberChek Probe",
        serialPrefix: "MIC-FCP300",
        defaultPrice: 2600,
        maxCycles: 400,
      },
      {
        model: "Microscopio Óptico Noyes OFS300",
        serialPrefix: "MIC-OFS300",
        defaultPrice: 2100,
        maxCycles: 350,
      },
    ],
  });

  const getNextConsecutive = () => String(assets.length + 1).padStart(3, "0");

  // New asset form state
  const [newCategory, setNewCategory] = useState("Fusionadoras");
  const [newModel, setNewModel] = useState("Fusionadora de Fibra Fujikura 90S+");
  const [isAddingCustomModel, setIsAddingCustomModel] = useState(false);
  const [customBrand, setCustomBrand] = useState("Fujikura");
  const [customRefCode, setCustomRefCode] = useState("");
  const [customModelError, setCustomModelError] = useState<string | null>(null);
  const [modelSearchTerm, setModelSearchTerm] = useState("");
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
    setShowAllModels(false);
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

  const toggleNewAssetForm = () => {
    if (isNewAssetOpen) {
      setIsNewAssetOpen(false);
      return;
    }
    setCustomModelError(null);
    setModelSearchTerm("");
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
    setIsNewAssetOpen(true);
    setTimeout(() => {
      document.getElementById("nuevo-equipo-desplegable")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
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

    // Mapeo numérico para backend GraphQL
    const categoryMap: Record<string, number> = {
      Fusionadoras: 1,
      Reflectómetros: 2,
      Analizadores: 2,
      Microscopios: 3,
    };
    const catId = categoryMap[newCategory] || 1;

    const locMap: Record<string, number> = {
      "Bodega Principal - A1": 1,
      "Bodega Principal - A2": 1,
      "Bodega Principal - B1": 1,
      "Bodega Principal - B2": 1,
      "Taller Técnico - T1": 1,
      "Taller Técnico - T2": 1,
      "Sucursal Medellín - S1": 2,
      "Sucursal Medellín - S2": 2,
    };
    const locId = locMap[newLocation] || 1;

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
      qrCode: `QR-${newSerial.toUpperCase()}`,
    };

    try {
      const res = await createAssetMutation({
        variables: {
          input: {
            serialNumber: newSerial.toUpperCase(),
            model: finalModelName,
            estimatedValue: numericPrice,
            acquisitionDate: new Date().toISOString().split("T")[0],
            categoryId: catId,
            locationId: locId,
          },
        },
      });
      const payload = (res?.data as any)?.createAsset;
      if (payload?.id) {
        created.id = String(payload.id);
      }
      await refetch();
    } catch {
      // Backend fallback en caso de modo offline
    }

    // Guardar en el almacenamiento persistente de equipos registrados
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REGISTERED);
      const existingList: AssetItem[] = saved ? JSON.parse(saved) : [];
      const updatedList = [
        created,
        ...existingList.filter((x) => x.serialNumber.toUpperCase() !== created.serialNumber.toUpperCase()),
      ];
      localStorage.setItem(STORAGE_KEY_REGISTERED, JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    setAssets((prev) => [
      created,
      ...prev.filter((x) => x.serialNumber.toUpperCase() !== created.serialNumber.toUpperCase()),
    ]);
    setIsNewAssetOpen(false);
    setNotice(`Equipo "${finalModelName}" (${newSerial}) registrado y guardado exitosamente en el inventario.`);
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
          setNotice(`${payload.insertedCount} equipos importados correctamente.`);
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

  const downloadQrTag = async (asset: AssetItem) => {
    try {
      const codeValue = asset.qrCode || `QR-${asset.serialNumber}`;
      const qrDataUrl = await QRCode.toDataURL(codeValue, {
        width: 320,
        margin: 1,
        color: { dark: "#172B4D", light: "#FFFFFF" },
      });

      const canvas = document.createElement("canvas");
      canvas.width = 650;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fondo blanco y marco industrial
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1995AD";
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      // Franja superior institucional
      ctx.fillStyle = "#172B4D";
      ctx.fillRect(11, 11, canvas.width - 22, 60);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("GLOBALNET TELECOM", 30, 48);

      ctx.fillStyle = "#A1D6E2";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("ETIQUETA OFICIAL DE CUSTODIA", 350, 48);

      // Dibujar QR
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 28, 90, 220, 220);

        // Datos técnicos
        ctx.fillStyle = "#172B4D";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("SERIAL / CÓDIGO DE ACTIVO:", 275, 115);

        ctx.fillStyle = "#1995AD";
        ctx.font = "bold 26px monospace";
        ctx.fillText(asset.serialNumber, 275, 148);

        ctx.fillStyle = "#172B4D";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("MODELO HOMOLOGADO:", 275, 185);

        ctx.fillStyle = "#222222";
        ctx.font = "bold 15px sans-serif";
        const modelText = asset.model.length > 32 ? asset.model.slice(0, 30) + "..." : asset.model;
        ctx.fillText(modelText, 275, 208);

        ctx.fillStyle = "#172B4D";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("UBICACIÓN / BODEGA:", 275, 245);

        ctx.fillStyle = "#555555";
        ctx.font = "14px sans-serif";
        const locText = asset.location.length > 35 ? asset.location.slice(0, 33) + "..." : asset.location;
        ctx.fillText(locText, 275, 268);

        ctx.fillStyle = "#888888";
        ctx.font = "italic 11px sans-serif";
        ctx.fillText(`ID QR: ${codeValue} | Válido para Inspección y Auditoría`, 275, 305);

        // Descargar PNG
        const link = document.createElement("a");
        link.download = `etiqueta-qr-${asset.serialNumber}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setNotice(`Etiqueta QR descargada para ${asset.serialNumber}.`);
      };
      img.src = qrDataUrl;
    } catch (e) {
      console.error("Error al generar la etiqueta QR", e);
    }
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
      {/* Encabezado e Informes con desenfoque dinámico cuando el formulario de nuevo equipo está desplegado */}
      <div
        className={`space-y-5 transition-all duration-300 ${
          isNewAssetOpen ? "blur-sm opacity-50 pointer-events-none select-none" : ""
        }`}
      >
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
                onClick={toggleNewAssetForm}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isNewAssetOpen
                    ? "bg-[#172B4D] text-[#A1D6E2] ring-2 ring-[#1995AD]"
                    : "bg-[#1995AD] hover:bg-[#172B4D] text-white"
                }`}
                title="Abrir o cerrar el formulario desplegable de nuevo equipo"
              >
                <Plus className={`h-4 w-4 transition-transform duration-200 ${isNewAssetOpen ? "rotate-45" : ""}`} />
                <span>Registrar nuevo equipo</span>
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

        {/* Desplegable limpio de Gráfica e Informe por Categoría (amplio y con mejor jerarquía) */}
        <div className="bg-white rounded-3xl border-2 border-[#AFC8D0]/70 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setIsChartsOpen(!isChartsOpen)}
            className="w-full px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F1F1F2]/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center shrink-0">
                <BarChart3 className="h-6 w-6" />
              </div>
              <span className="font-title text-lg sm:text-xl text-[#172B4D] tracking-tight">
                Gráfica de Valores e Informe —{" "}
                <span className="text-[#1995AD]">
                  {categoryFilter === "ALL" ? "Todas las Categorías" : categoryFilter}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-5 text-xs sm:text-sm font-bold">
              <span className="hidden sm:inline text-[#172B4D]/70">
                Compra: <strong className="text-[#172B4D]">{formatCurrency(totalPurchaseValue)}</strong>
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                Hoy: <strong>{formatCurrency(totalCurrentBookValue)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-white bg-[#1995AD] hover:bg-[#172B4D] px-4 py-2 rounded-xl shadow-xs transition-colors">
                {isChartsOpen ? (
                  <>
                    <span>Ocultar</span> <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Ver gráfica</span> <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </span>
            </div>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isChartsOpen ? "max-h-[1600px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
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
          </div>
        </div>
      </div>

      {/* Desplegable de Nuevo Equipo (Totalmente Funcional, Visible e Integrado en Página) */}
      {role === "ADMIN" && (
        <div
          id="nuevo-equipo-desplegable"
          className="bg-white rounded-3xl border-2 border-[#1995AD] shadow-2xl max-h-[85vh] overflow-y-auto overscroll-contain transition-all duration-200"
        >
          <button
            type="button"
            onClick={toggleNewAssetForm}
            className="w-full bg-gradient-to-r from-[#172B4D] via-[#1B4965] to-[#1995AD] px-6 py-4.5 text-white flex flex-wrap items-center justify-between gap-4 text-left cursor-pointer hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shrink-0 shadow-inner">
                <Plus className={`h-6 w-6 transition-transform duration-200 ${isNewAssetOpen ? "rotate-45" : ""}`} />
              </div>
              <h3 className="font-title text-lg sm:text-xl tracking-wide text-white">
                Registrar nuevo equipo
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/90 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
                {isNewAssetOpen ? "Ocultar formulario" : "Desplegar para registrar"}
              </span>
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                {isNewAssetOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </button>

          {isNewAssetOpen && (
            <form onSubmit={handleCreateAsset} className="p-6 space-y-6 bg-white border-t border-[#AFC8D0]/40">
              {/* Indicación oficial de nomenclatura del ID / Serial del equipo */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#172B4D]/5 via-[#1995AD]/10 to-[#A1D6E2]/25 border-2 border-[#1995AD]/40 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#1995AD] bg-white px-2.5 py-0.5 rounded-md border border-[#1995AD]/30 shadow-2xs">
                      Identificador Único (ID)
                    </span>
                    <span className="text-xs font-bold text-[#172B4D]">
                      Estructura obligatoria de 3 partes:
                    </span>
                    <code className="text-xs font-mono font-extrabold bg-[#172B4D] text-[#A1D6E2] px-2 py-0.5 rounded-md">
                      [PREFIJO] - [MODELO/REF] - [000]
                    </code>
                  </div>
                  <p className="text-xs text-[#172B4D]/80 leading-relaxed">
                    • <strong>Prefijos por categoría:</strong> <code className="font-mono text-[#1995AD] font-bold">FUS</code> (Fusionadoras), <code className="font-mono text-[#1995AD] font-bold">OTDR</code> (Reflectómetros), <code className="font-mono text-[#1995AD] font-bold">ANAL</code> (Analizadores), <code className="font-mono text-[#1995AD] font-bold">MIC</code> (Microscopios).<br className="hidden sm:inline" />
                    • <strong>Referencia:</strong> Código alfanumérico sin guiones intermedios (ej. 90S, 730C, ONX580, FIP435).<br className="hidden sm:inline" />
                    • <strong>Consecutivo:</strong> Número de 3 dígitos autoincrementado automáticamente por el sistema.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border-2 border-[#1995AD] shadow-xs self-start md:self-auto shrink-0">
                  <div className="h-8 w-8 rounded-lg bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#172B4D]/60 uppercase block">ID asignado</span>
                    <span className="font-mono font-black text-sm text-[#172B4D] tracking-wide">
                      {newSerial}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Categoría */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#A1D6E2]/25 via-[#AFC8D0]/15 to-white border-2 border-[#1995AD]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1995AD] text-white flex items-center justify-center text-[11px] font-extrabold">1</span>
                    Categoría
                  </label>
                  <span className="text-[11px] font-bold text-[#1995AD]">Seleccionada: {newCategory}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["Fusionadoras", "Reflectómetros", "Analizadores", "Microscopios"] as const).map(
                    (cat) => {
                      const active = newCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryChange(cat)}
                          className={`py-3 px-3.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                            active
                              ? "bg-gradient-to-r from-[#1995AD] to-[#172B4D] text-white border-[#1995AD] shadow-md scale-[1.02]"
                              : "bg-white text-[#172B4D] border-[#AFC8D0] hover:border-[#1995AD] hover:bg-[#A1D6E2]/20"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* 2. Equipo / Modelo */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#F8FAFC] via-white to-[#A1D6E2]/15 border-2 border-[#1995AD]/30 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1995AD] text-white flex items-center justify-center text-[11px] font-extrabold">2</span>
                    Equipo / Modelo
                  </label>
                  <div className="inline-flex rounded-xl bg-[#F1F1F2] p-1 border border-[#AFC8D0] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleModelChange(newModel)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  <div className="space-y-3">
                    {/* Buscador / Filtro de modelos de la categoría */}
                    <div className="relative">
                      <Search className="h-4 w-4 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={`Buscar modelo en ${newCategory}...`}
                        value={modelSearchTerm}
                        onChange={(e) => setModelSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[#AFC8D0] bg-white text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD] shadow-xs"
                      />
                    </div>

                    {/* Etiqueta requerida: Modelos más comprados/usados y opción de Mostrar todos */}
                    {!modelSearchTerm.trim() && (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#1995AD] to-[#172B4D] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                              <TrendingUp className="h-3.5 w-3.5 text-[#A1D6E2]" />
                              Modelos más comprados/usados
                            </span>
                            <span className="text-[11px] font-bold text-[#172B4D]/70 hidden sm:inline">
                              (Top 5 de {newCategory})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowAllModels((prev) => !prev)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#1995AD] text-[#1995AD] hover:bg-[#1995AD] hover:text-white text-xs font-extrabold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                          >
                            <span>
                              {showAllModels
                                ? "Mostrar solo los 5 más usados"
                                : `Mostrar todos (${(equipmentCatalog[newCategory] || []).length})`}
                            </span>
                          </button>
                        </div>

                        {/* Grilla de modelos (5 más usados o todos al presionar Mostrar todos) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {(showAllModels
                            ? (equipmentCatalog[newCategory] || [])
                            : (equipmentCatalog[newCategory] || []).slice(0, 5)
                          ).map((item, idx) => {
                            const selected = newModel === item.model;
                            return (
                              <button
                                key={item.model}
                                type="button"
                                onClick={() => handleModelChange(item.model)}
                                className={`relative w-full p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  selected
                                    ? "border-[#1995AD] bg-[#A1D6E2]/35 text-[#172B4D] ring-2 ring-[#1995AD]/40 shadow-sm scale-[1.01]"
                                    : "border-[#AFC8D0]/80 bg-white hover:border-[#1995AD] hover:bg-[#F1F1F2]/80 text-[#172B4D]"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                                    idx === 0
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-[#1995AD]/15 text-[#172B4D] border border-[#1995AD]/30"
                                  }`}>
                                    #{idx + 1} Más usado
                                  </span>
                                  {selected && (
                                    <Check className="h-4 w-4 text-[#1995AD] stroke-[2.5]" />
                                  )}
                                </div>
                                <span className="font-bold text-xs sm:text-sm leading-snug line-clamp-2">
                                  {item.model}
                                </span>
                                <span className="text-[11px] font-bold text-[#1995AD] mt-1.5">
                                  {formatCurrency(item.defaultPrice)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Si está buscando o hay más modelos, mostrarlos aquí */}
                    {modelSearchTerm.trim() && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[#172B4D]/75">
                          Resultados de búsqueda en {newCategory}:
                        </span>
                        {(() => {
                          const list = (equipmentCatalog[newCategory] || []).filter((m) =>
                            m.model.toLowerCase().includes(modelSearchTerm.toLowerCase())
                          );
                          if (list.length === 0) {
                            return (
                              <div className="p-4 text-center text-xs text-[#172B4D]/60 font-medium bg-white rounded-xl border border-dashed border-[#AFC8D0]">
                                No se encontraron modelos con &quot;{modelSearchTerm}&quot; en {newCategory}.
                              </div>
                            );
                          }
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                              {list.map((item) => {
                                const selected = newModel === item.model;
                                return (
                                  <button
                                    key={item.model}
                                    type="button"
                                    onClick={() => handleModelChange(item.model)}
                                    className={`relative w-full p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                                      selected
                                        ? "border-[#1995AD] bg-[#A1D6E2]/35 text-[#172B4D] ring-2 ring-[#1995AD]/40 shadow-sm"
                                        : "border-[#AFC8D0]/80 bg-white hover:border-[#1995AD] text-[#172B4D]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-bold text-xs sm:text-sm leading-snug">
                                        {item.model}
                                      </span>
                                      {selected && (
                                        <Check className="h-4 w-4 text-[#1995AD] stroke-[2.5]" />
                                      )}
                                    </div>
                                    <span className="text-[11px] font-bold text-[#1995AD] mt-1">
                                      {formatCurrency(item.defaultPrice)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#F1F1F2]/70 border border-[#1995AD]/45 space-y-3.5">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase text-[#172B4D]/75 block">
                        Marca Autorizada ({newCategory})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(AUTHORIZED_BRANDS_BY_CATEGORY[newCategory] || []).map((b) => {
                          const activeBrand = customBrand === b;
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setCustomBrand(b)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                      <label className="text-[11px] font-bold uppercase text-[#172B4D]/75 block">
                        Código de Referencia (con números, ej: 45S, 720C)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 45S"
                        value={customRefCode}
                        onChange={(e) => handleCustomRefChange(e.target.value)}
                        className="w-full max-w-sm px-3.5 py-2 rounded-xl border border-[#1995AD] bg-white font-mono font-bold text-[#172B4D] text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
                      />
                    </div>

                    {customModelError && (
                      <p className="text-xs font-bold text-red-600">{customModelError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Ubicación y 4. Precio con recuadros distintivos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 3. Ubicación con recuadro auto-expansible sin cortes */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F1F1F2] via-white to-[#A1D6E2]/20 border-2 border-[#1995AD]/30 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1995AD] text-white flex items-center justify-center text-[11px] font-extrabold">3</span>
                    Ubicación
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsLocationSelectOpen(!isLocationSelectOpen)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 bg-white text-sm font-bold text-[#172B4D] transition-all cursor-pointer shadow-xs ${
                      isLocationSelectOpen
                        ? "border-[#1995AD] ring-2 ring-[#1995AD]/25"
                        : "border-[#AFC8D0] hover:border-[#1995AD]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <MapPin className="h-4 w-4 text-[#1995AD] shrink-0" />
                      <span className="truncate">{newLocation}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#1995AD] transition-transform duration-200 shrink-0 ${
                        isLocationSelectOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Lista de bodegas expandida dentro del recuadro (hace crecer el recuadro sin cortarse) */}
                  {isLocationSelectOpen && (
                    <div className="mt-2 space-y-1.5 rounded-xl border-2 border-[#1995AD]/40 bg-white p-2 shadow-inner transition-all animate-fadeIn">
                      {warehouseSelectOptions.map((opt) => {
                        const isSelected = opt.value === newLocation;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setNewLocation(opt.value);
                              setIsLocationSelectOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-left ${
                              isSelected
                                ? "bg-[#1995AD] text-white shadow-xs"
                                : "text-[#172B4D] hover:bg-[#A1D6E2]/25"
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <Building className={`h-4 w-4 ${isSelected ? "text-white" : "text-[#1995AD]"}`} />
                              {opt.label}
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-white stroke-[2.5]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Precio */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F1F1F2] via-white to-[#AFC8D0]/20 border-2 border-[#1995AD]/30 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1995AD] text-white flex items-center justify-center text-[11px] font-extrabold">4</span>
                    Precio Estimado
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-base text-[#1995AD]">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="Ingresa el valor numérico"
                      value={newValue}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                        if ((cleaned.match(/\./g) || []).length <= 1) {
                          setNewValue(cleaned);
                        }
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-[#AFC8D0] bg-white font-black text-[#172B4D] text-sm focus:outline-hidden focus:border-[#1995AD] focus:ring-2 focus:ring-[#1995AD]/25 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción del desplegable */}
              <div className="pt-3 border-t border-[#AFC8D0]/40 flex flex-col sm:flex-row justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewAssetOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#F1F1F2] hover:bg-[#BCBABE]/40 text-[#172B4D] font-bold text-sm transition-colors cursor-pointer border border-[#AFC8D0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1995AD] to-[#172B4D] hover:from-[#172B4D] hover:to-[#1995AD] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Guardar Equipo en Inventario
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tabla única con filtros integrados arriba */}
      <div
        className={`bg-white rounded-2xl border border-[#AFC8D0]/60 shadow-xs transition-all duration-300 ${
          isNewAssetOpen ? "blur-sm opacity-50 pointer-events-none select-none" : ""
        }`}
      >
        <div className="p-4 border-b border-[#F1F1F2] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
          <div className="relative">
            <Search className="h-5 w-5 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar serie o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#AFC8D0] text-sm sm:text-base font-semibold text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD] min-h-[48px] bg-white shadow-xs"
            />
          </div>

          <CustomSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            size="lg"
            ariaLabel="Filtrar por categoría"
          />

          <CustomSelect
            value={locationFilter}
            onChange={setLocationFilter}
            options={locationOptions}
            size="lg"
            ariaLabel="Filtrar por bodega"
          />

          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            size="lg"
            ariaLabel="Filtrar por estado"
          />
        </div>

        {/* Vista Cuadriculada: 3 cuadros que representan los productos y así para abajo */}
        <div className="p-5">
          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center text-[#BCBABE] space-y-2">
              <Package className="h-12 w-12 mx-auto text-[#AFC8D0]" />
              <p className="font-bold text-base text-[#172B4D]">No se encontraron equipos</p>
              <p className="text-xs text-[#172B4D]/60 max-w-sm mx-auto">
                Prueba cambiando o limpiando los filtros de categoría, bodega o disponibilidad.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssets.map((asset) => {
                const badge = getCalibrationBadge(asset);
                const dep = calculateDepreciation(asset, 5);
                const usagePercent = Math.min(
                  100,
                  Math.round((asset.usageCycles / Math.max(1, asset.maxUsageCycles)) * 100)
                );
                const remainingCycles = Math.max(0, asset.maxUsageCycles - asset.usageCycles);

                return (
                  <div
                    key={`asset-${asset.id}-${asset.serialNumber}`}
                    className="bg-white rounded-2xl border border-[#AFC8D0]/60 p-5 space-y-4 hover:border-[#1995AD] hover:shadow-md transition-all shadow-xs flex flex-col justify-between"
                  >
                    {/* ENCABEZADO DEL CUADRO: Serial, Categoría y Disponibilidad */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-[#172B4D] text-[#A1D6E2] tracking-wider border border-[#1995AD]/40 shadow-xs">
                          {asset.serialNumber}
                        </span>

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
                      </div>

                      {/* MODELO Y UBICACIÓN */}
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#1995AD] tracking-wider block mb-1">
                          {asset.category}
                        </span>
                        <h3 className="font-black text-base sm:text-lg text-[#172B4D] leading-snug line-clamp-2 min-h-[3rem]">
                          {asset.model}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-[#172B4D]/70 font-semibold mt-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#1995AD] shrink-0" />
                          <span className="truncate">{asset.location}</span>
                        </div>
                      </div>

                      {/* BLOQUE DE DESGASTE Y CALIBRACIÓN */}
                      <div className="bg-[#F1F1F2]/80 border border-[#AFC8D0]/50 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#172B4D]">
                            {asset.usageCycles} de {asset.maxUsageCycles} usos
                          </span>
                          <span className="text-[11px] font-bold text-[#172B4D]/75">
                            {badge.label}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white border border-[#AFC8D0]/40 overflow-hidden">
                          <div
                            style={{ width: `${usagePercent}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${badge.barColor}`}
                          />
                        </div>
                        <p className="text-[10px] text-[#172B4D]/60 font-medium">
                          Restan {remainingCycles} usos antes de mantenimiento
                        </p>
                      </div>

                      {/* VALORES ECONÓMICOS DE LA PALETA */}
                      <div className="bg-gradient-to-r from-[#A1D6E2]/25 to-[#1995AD]/10 border border-[#1995AD]/30 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[#172B4D]/70 uppercase block">
                            Valor en Libros
                          </span>
                          <span className="font-extrabold text-base text-emerald-700">
                            {formatCurrency(dep.bookValue)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-[#172B4D]/70 uppercase block">
                            Compra Inicial
                          </span>
                          <span className="text-xs font-bold text-[#172B4D]/80">
                            {formatCurrency(asset.estimatedValue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#AFC8D0]/30">
                      <button
                        type="button"
                        onClick={() => {
                          setUsefulLifeYears(5);
                          setSelectedAssetForDepreciation(asset);
                        }}
                        title="Ver desglose y calculadora de depreciación"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#F1F1F2] hover:bg-[#A1D6E2]/40 text-[#172B4D] text-xs font-bold transition-colors border border-[#AFC8D0]/50 cursor-pointer"
                      >
                        <Calculator className="h-3.5 w-3.5 text-[#1995AD]" />
                        <span>Ver cálculo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadQrTag(asset)}
                        title="Descargar Etiqueta QR Oficial"
                        className="p-2 rounded-xl text-[#1995AD] bg-[#A1D6E2]/25 hover:bg-[#A1D6E2]/50 border border-[#1995AD]/30 transition-colors cursor-pointer"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>

                      {(role === "INSPECTOR" || role === "ADMIN") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssetForStatusChange(asset);
                            setNewStatusValue(asset.status);
                            setStatusChangeNotes("");
                          }}
                          title="Modificar estado físico del activo"
                          className="p-2 rounded-xl text-[#1995AD] bg-[#A1D6E2]/25 hover:bg-[#A1D6E2]/50 border border-[#1995AD]/30 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                      )}

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
                          className="inline-flex items-center gap-1 py-2 px-3.5 rounded-xl bg-[#1995AD] text-white text-xs font-bold hover:bg-[#172B4D] cursor-pointer shadow-xs transition-colors"
                        >
                          <Send className="h-3 w-3" /> Solicitar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Modificación de Estado Físico del Activo */}
      {isMounted && selectedAssetForStatusChange && createPortal(
        <div
          onClick={() => setSelectedAssetForStatusChange(null)}
          className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 flex items-start sm:items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#1995AD]/50 max-h-[90vh] flex flex-col overflow-hidden my-auto relative z-10"
          >
            <div className="flex items-center justify-between border-b border-[#F1F1F2] p-5 pb-3 shrink-0">
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

            <form onSubmit={handleUpdateStatusSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div ref={statusModalBodyRef} className="p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain scrollbar-thin scrollbar-thumb-[#AFC8D0]">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1.5">
                    Nuevo Estado Físico
                  </label>
                  <CustomSelect
                    value={newStatusValue}
                    onChange={(val) =>
                      setNewStatusValue(val as AssetItem["status"])
                    }
                    options={statusChangeOptions}
                    size="lg"
                  />
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
              </div>

              <div className="flex items-center justify-end gap-2 p-4 bg-[#F8FAFC] border-t border-[#F1F1F2] shrink-0">
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
        </div>,
        document.body
      )}

      {/* Modal Calculadora Limpio */}
      {isMounted && selectedAssetForDepreciation && createPortal(
        <div
          onClick={() => setSelectedAssetForDepreciation(null)}
          className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 flex items-start sm:items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#1995AD]/50 max-h-[90vh] flex flex-col overflow-hidden my-auto relative z-10"
          >
            <div className="flex items-center justify-between border-b border-[#F1F1F2] p-5 pb-3 shrink-0">
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
                <div ref={depModalBodyRef} className="p-5 space-y-3.5 text-sm overflow-y-auto flex-1 overscroll-contain scrollbar-thin scrollbar-thumb-[#AFC8D0]">
                  <div className="flex items-center justify-between bg-[#F1F1F2] px-3.5 py-2 rounded-xl">
                    <span className="font-bold text-[#172B4D] text-xs">Vida útil:</span>
                    <CustomSelect
                      value={String(usefulLifeYears)}
                      onChange={(val) => setUsefulLifeYears(Number(val))}
                      options={usefulLifeOptions}
                      size="sm"
                      className="w-48"
                    />
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

            <div className="p-4 bg-[#F8FAFC] border-t border-[#F1F1F2] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAssetForDepreciation(null)}
                className="px-5 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white text-xs font-bold cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Solicitud */}
      {isMounted && selectedAssetForRequest && createPortal(
        <div
          onClick={() => setSelectedAssetForRequest(null)}
          className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 flex items-start sm:items-center justify-center"
        >
          <form
            onSubmit={handleRequestSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#1995AD]/50 max-h-[90vh] flex flex-col overflow-hidden my-auto relative z-10"
          >
            <div className="flex items-center justify-between border-b border-[#F1F1F2] p-5 pb-3 shrink-0">
              <h3 className="font-title text-xl text-[#172B4D]">Solicitar Equipo</h3>
              <button
                type="button"
                onClick={() => setSelectedAssetForRequest(null)}
                className="text-[#BCBABE] hover:text-[#172B4D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={requestModalBodyRef} className="p-5 space-y-3 text-sm overflow-y-auto flex-1 overscroll-contain scrollbar-thin scrollbar-thumb-[#AFC8D0]">
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

            <div className="p-4 bg-[#F8FAFC] border-t border-[#F1F1F2] flex gap-2 shrink-0">
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
        </div>,
        document.body
      )}

      {/* Modal Importación Masiva */}
      {isMounted && isBulkModalOpen && createPortal(
        <div
          onClick={() => setIsBulkModalOpen(false)}
          className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 flex items-start sm:items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-[#1995AD]/50 my-auto relative z-10"
          >
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
        </div>,
        document.body
      )}
    </div>
  );
}
