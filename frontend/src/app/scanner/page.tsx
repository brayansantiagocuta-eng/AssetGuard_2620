"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useQuery } from "@apollo/client/react";
import { GET_ASSETS_QUERY } from "@/lib/graphql/queries";
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle,
  AlertCircle,
  Package,
  Upload,
  FileImage,
  FileText,
  History,
  Trash2,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Check,
  Layers,
  Download,
} from "lucide-react";

export interface ScannedAssetDetails {
  serial: string;
  qrCode: string;
  model: string;
  category: string;
  status: "AVAILABLE" | "ON_LOAN" | "MAINTENANCE";
  cycles: string;
  calibration: string;
  location: string;
  estimatedValue: string;
  scannedAt: string;
  scannedMethod: "CAMARA" | "ARCHIVO" | "MANUAL";
}

// 5 equipos/modelos más comprados y usados de GlobalNet Telecom para pruebas
export const TOP_5_MOST_USED_SERIALS = [
  "FUS-90S-001",
  "OTDR-730C-002",
  "ANAL-ONX580-003",
  "MIC-FIP435-004",
  "FUS-70S-005",
] as const;

// Mapeo de compatibilidad histórica para seriales anteriores que tenían 4 segmentos o PWR
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

// Catálogo completo oficial de los 15 equipos de GlobalNet Telecom (estandarizado a 3 partes)
const OFFICIAL_CATALOG: Record<string, Omit<ScannedAssetDetails, "scannedAt" | "scannedMethod">> = {
  "FUS-90S-001": {
    serial: "FUS-90S-001",
    qrCode: "QR-FUS-90S-001",
    model: "Fusionadora de Fibra Fujikura 90S+",
    category: "Fusionadoras de Fibra",
    status: "AVAILABLE",
    cycles: "120 / 1000",
    calibration: "Vigente (Vence en 150 días)",
    location: "Bodega Principal - Calle 26 (A1)",
    estimatedValue: "$8,500.00",
  },
  "OTDR-730C-002": {
    serial: "OTDR-730C-002",
    qrCode: "QR-OTDR-730C-002",
    model: "Reflectómetro Óptico EXFO 730C",
    category: "Reflectómetros Ópticos (OTDR)",
    status: "ON_LOAN",
    cycles: "340 / 500",
    calibration: "Vigente (Vence en 45 días)",
    location: "Bodega Principal - Calle 26 (B2)",
    estimatedValue: "$12,000.00",
  },
  "ANAL-ONX580-003": {
    serial: "ANAL-ONX580-003",
    qrCode: "QR-ANAL-ONX580-003",
    model: "Analizador de Red Viavi ONX-580",
    category: "Analizadores de Red",
    status: "MAINTENANCE",
    cycles: "495 / 500",
    calibration: "Vencida (En Laboratorio)",
    location: "Taller Técnico Central",
    estimatedValue: "$9,200.00",
  },
  "MIC-FIP435-004": {
    serial: "MIC-FIP435-004",
    qrCode: "QR-MIC-FIP435-004",
    model: "Sonda de Inspección Óptica EXFO",
    category: "Microscopios de Fibra",
    status: "AVAILABLE",
    cycles: "85 / 800",
    calibration: "Vigente (Vence en 90 días)",
    location: "Bodega Principal - Calle 26 (A2)",
    estimatedValue: "$4,100.00",
  },
  "FUS-70S-005": {
    serial: "FUS-70S-005",
    qrCode: "QR-FUS-70S-005",
    model: "Fusionadora de Fibra Fujikura 70S",
    category: "Fusionadoras de Fibra",
    status: "AVAILABLE",
    cycles: "540 / 800",
    calibration: "Vigente (Vence en 110 días)",
    location: "Sucursal Operativa Medellín (Poblado)",
    estimatedValue: "$7,300.00",
  },
  "FUS-T72C-006": {
    serial: "FUS-T72C-006",
    qrCode: "QR-FUS-T72C-006",
    model: "Fusionadora de Fibra Sumitomo T-72C",
    category: "Fusionadoras de Fibra",
    status: "AVAILABLE",
    cycles: "190 / 900",
    calibration: "Vigente (Vence en 200 días)",
    location: "Bodega Principal - Calle 26 (A3)",
    estimatedValue: "$7,800.00",
  },
  "FUS-VIEW7-007": {
    serial: "FUS-VIEW7-007",
    qrCode: "QR-FUS-VIEW7-007",
    model: "Fusionadora de Fibra INNO View 7",
    category: "Fusionadoras de Fibra",
    status: "AVAILABLE",
    cycles: "230 / 850",
    calibration: "Vigente (Vence en 85 días)",
    location: "Sucursal Operativa Medellín (Poblado)",
    estimatedValue: "$6,900.00",
  },
  "OTDR-SMART-008": {
    serial: "OTDR-SMART-008",
    qrCode: "QR-OTDR-SMART-008",
    model: "Reflectómetro Óptico Viavi SmartOTDR",
    category: "Reflectómetros Ópticos (OTDR)",
    status: "AVAILABLE",
    cycles: "115 / 600",
    calibration: "Vigente (Vence en 140 días)",
    location: "Bodega Principal - Calle 26 (B1)",
    estimatedValue: "$10,500.00",
  },
  "OTDR-AQ7280-009": {
    serial: "OTDR-AQ7280-009",
    qrCode: "QR-OTDR-AQ7280-009",
    model: "Reflectómetro Óptico Yokogawa AQ7280",
    category: "Reflectómetros Ópticos (OTDR)",
    status: "ON_LOAN",
    cycles: "410 / 550",
    calibration: "Vigente (Vence en 60 días)",
    location: "Bodega Principal - Calle 26 (B3)",
    estimatedValue: "$13,200.00",
  },
  "OTDR-MT9085-010": {
    serial: "OTDR-MT9085-010",
    qrCode: "QR-OTDR-MT9085-010",
    model: "Reflectómetro Óptico Anritsu MT9085",
    category: "Reflectómetros Ópticos (OTDR)",
    status: "AVAILABLE",
    cycles: "95 / 500",
    calibration: "Vigente (Vence en 175 días)",
    location: "Sucursal Operativa Medellín (Poblado)",
    estimatedValue: "$11,800.00",
  },
  "ANAL-FTB1-011": {
    serial: "ANAL-FTB1-011",
    qrCode: "QR-ANAL-FTB1-011",
    model: "Analizador Modular EXFO FTB-1v2",
    category: "Analizadores de Red",
    status: "AVAILABLE",
    cycles: "140 / 700",
    calibration: "Vigente (Vence en 130 días)",
    location: "Bodega Principal - Calle 26 (C1)",
    estimatedValue: "$14,500.00",
  },
  "ANAL-DSX8000-012": {
    serial: "ANAL-DSX8000-012",
    qrCode: "QR-ANAL-DSX8000-012",
    model: "Certificador de Red Fluke DSX-8000",
    category: "Analizadores de Red",
    status: "ON_LOAN",
    cycles: "380 / 600",
    calibration: "Vigente (Vence en 40 días)",
    location: "Bodega Principal - Calle 26 (C2)",
    estimatedValue: "$16,000.00",
  },
  "ANAL-MS2090-013": {
    serial: "ANAL-MS2090-013",
    qrCode: "QR-ANAL-MS2090-013",
    model: "Analizador de Espectro Anritsu MS2090A",
    category: "Analizadores de Red",
    status: "MAINTENANCE",
    cycles: "520 / 550",
    calibration: "En Mantenimiento Calibración",
    location: "Taller Técnico Central",
    estimatedValue: "$22,000.00",
  },
  "MIC-P5000I-014": {
    serial: "MIC-P5000I-014",
    qrCode: "QR-MIC-P5000I-014",
    model: "Microscopio de Fibra Viavi P5000i",
    category: "Microscopios de Fibra",
    status: "AVAILABLE",
    cycles: "70 / 900",
    calibration: "Vigente (Vence en 210 días)",
    location: "Bodega Principal - Calle 26 (A4)",
    estimatedValue: "$3,600.00",
  },
  "MIC-FI7000-015": {
    serial: "MIC-FI7000-015",
    qrCode: "QR-MIC-FI7000-015",
    model: "Certificador de Inspección Fluke FI-7000",
    category: "Microscopios de Fibra",
    status: "AVAILABLE",
    cycles: "110 / 750",
    calibration: "Vigente (Vence en 160 días)",
    location: "Sucursal Operativa Medellín (Poblado)",
    estimatedValue: "$4,800.00",
  },
};

const STORAGE_KEY_HISTORY = "assetguard_scanned_fichas_history";

// Función auxiliar para recortar el área donde se ubica el código QR en las etiquetas industriales
const extractQrRegionBlob = (file: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement("canvas");
        // En la etiqueta industrial (650x360), el código QR está en la zona izquierda x: 28, y: 90, w: 220, h: 220
        const sx = Math.floor(img.width * 0.02);
        const sy = Math.floor(img.height * 0.18);
        const sw = Math.floor(img.width * 0.44);
        const sh = Math.floor(img.height * 0.75);

        canvas.width = Math.max(120, sw);
        canvas.height = Math.max(120, sh);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/png");
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
};

export default function ScannerPage() {
  const { data: dbAssetsData } = useQuery<any>(GET_ASSETS_QUERY, {
    variables: { pagination: { page: 0, size: 100 } },
    fetchPolicy: "cache-and-network",
  });

  const [activeTab, setActiveTab] = useState<"CAMERA" | "FILE" | "MANUAL">("CAMERA");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [assetDetails, setAssetDetails] = useState<ScannedAssetDetails | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileSuccessNotice, setFileSuccessNotice] = useState<string | null>(null);

  // Estados para Arrastrar y Soltar (Drag & Drop) de archivos QR
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [showAllTestSerials, setShowAllTestSerials] = useState(false);

  // Lista de fichas almacenadas
  const [scannedHistory, setScannedHistory] = useState<ScannedAssetDetails[]>([]);
  const [activeQrDataUrl, setActiveQrDataUrl] = useState<string | null>(null);

  // Generar código QR real cuando cambia assetDetails
  useEffect(() => {
    if (assetDetails) {
      QRCode.toDataURL(assetDetails.qrCode || assetDetails.serial, {
        width: 300,
        margin: 1,
        color: { dark: "#172B4D", light: "#FFFFFF" },
      })
        .then(setActiveQrDataUrl)
        .catch(() => setActiveQrDataUrl(null));
    } else {
      setActiveQrDataUrl(null);
    }
  }, [assetDetails]);

  // Generar y descargar la etiqueta industrial oficial en PNG
  const downloadQrTag = async (asset: {
    serial: string;
    model: string;
    qrCode: string;
    location: string;
  }) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(asset.qrCode || asset.serial, {
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
        ctx.fillText(asset.serial, 275, 148);

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
        ctx.fillText(`ID QR: ${asset.qrCode} | Válido para Inspección y Auditoría`, 275, 305);

        // Descargar PNG
        const link = document.createElement("a");
        link.download = `etiqueta-qr-${asset.serial}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = qrDataUrl;
    } catch (e) {
      console.error("Error al generar la etiqueta QR", e);
    }
  };

  // Referencias para la cámara con html5-qrcode
  const qrScannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar historial de fichas guardadas desde almacenamiento local (estrictamente los 5 más usados)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const capped = parsed.slice(0, 5);
          setScannedHistory(capped);
          if (!assetDetails) {
            setAssetDetails(capped[0]);
            setScannedResult(capped[0].serial);
          }
          return;
        }
      }

      // Si aún no hay guardados, precargar exactamente los 5 más usados para pruebas rápidas
      const defaultTop5: ScannedAssetDetails[] = TOP_5_MOST_USED_SERIALS.map((serial) => ({
        ...OFFICIAL_CATALOG[serial],
        scannedAt: "08:00 AM",
        scannedMethod: "MANUAL" as const,
      }));
      setScannedHistory(defaultTop5);
      setAssetDetails(defaultTop5[0]);
      setScannedResult(defaultTop5[0].serial);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(defaultTop5));
    } catch {
      // ignore
    }
  }, []);

  // Guardar en el historial: solo se guardan 5 fichas de los 5 equipos más usados/escaneados
  const saveToHistory = (item: ScannedAssetDetails) => {
    setScannedHistory((prev) => {
      const filtered = prev.filter((p) => p.serial !== item.serial);
      const updated = [item, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setScannedHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {
      // ignore
    }
  };

  const handleRemoveHistoryItem = (serial: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScannedHistory((prev) => {
      const updated = prev.filter((item) => item.serial !== serial);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Buscar ficha de equipo en catálogo oficial o base de datos GraphQL
  const lookupAsset = (
    code: string,
    method: "CAMARA" | "ARCHIVO" | "MANUAL" = "MANUAL"
  ): boolean => {
    let clean = code.trim().toUpperCase();
    if (clean.startsWith("QR-")) {
      clean = clean.replace("QR-", "");
    }
    const resolvedClean = SERIAL_ALIASES[clean] || clean;

    setScannedResult(resolvedClean);

    // 1. Buscar coincidencia exacta por serial o modelo en catálogo oficial
    let found = OFFICIAL_CATALOG[resolvedClean] || OFFICIAL_CATALOG[clean];
    if (!found) {
      const key = Object.keys(OFFICIAL_CATALOG).find(
        (k) =>
          k.toUpperCase() === resolvedClean ||
          k.toUpperCase() === clean ||
          OFFICIAL_CATALOG[k].qrCode.toUpperCase() === code.trim().toUpperCase() ||
          OFFICIAL_CATALOG[k].serial.toUpperCase().includes(resolvedClean)
      );
      if (key) found = OFFICIAL_CATALOG[key];
    }

    // 2. Si no se encontró en catálogo estático, buscar en los datos de la base de datos (GraphQL)
    if (!found && dbAssetsData?.assets?.items) {
      const dbAsset = dbAssetsData.assets.items.find(
        (a: any) =>
          a.serialNumber.toUpperCase() === clean ||
          a.qrCode?.toUpperCase() === code.trim().toUpperCase() ||
          a.serialNumber.toUpperCase().includes(clean)
      );

      if (dbAsset) {
        found = {
          serial: dbAsset.serialNumber,
          qrCode: dbAsset.qrCode || `QR-${dbAsset.serialNumber}`,
          model: dbAsset.model,
          category: dbAsset.category?.name || "Equipo Especializado",
          status: dbAsset.status,
          cycles: `${dbAsset.usageCycles || 0} / ${dbAsset.maxUsageCycles || 500}`,
          calibration: dbAsset.calibrationStatus?.isCompliant
            ? `Vigente (Vence en ${dbAsset.calibrationStatus.daysUntilNextDue || 60} días)`
            : "Requiere Calibración",
          location: dbAsset.location?.name || "Bodega Principal",
          estimatedValue: `$${Number(dbAsset.estimatedValue || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`,
        };
      }
    }

    if (found) {
      const detailsWithMeta: ScannedAssetDetails = {
        ...found,
        scannedAt: new Date().toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        scannedMethod: method,
      };

      setAssetDetails(detailsWithMeta);
      setScannerError(null);
      saveToHistory(detailsWithMeta);
      return true;
    } else {
      setAssetDetails(null);
      setScannerError(`Código o serial no encontrado en inventario: "${code.trim()}"`);
      return false;
    }
  };

  // Iniciar / Detener Cámara con html5-qrcode
  useEffect(() => {
    let html5QrCodeInstance: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const element = document.getElementById("qr-reader-container");
        if (!element) return;

        html5QrCodeInstance = new Html5Qrcode("qr-reader-container");
        qrScannerRef.current = html5QrCodeInstance;

        await html5QrCodeInstance.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.72);
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.777778,
          },
          (decodedText: string) => {
            // Éxito al detectar un código
            lookupAsset(decodedText, "CAMARA");
            // Detener tras detección para evitar disparos repetidos
            stopScanner();
          },
          () => {
            // Ignorar errores por cuadro vacío
          }
        );
        setCameraError(null);
      } catch (err: any) {
        setCameraError(
          "No se pudo acceder a la cámara. Verifica los permisos del navegador o usa la carga de imágenes / manual."
        );
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
          qrScannerRef.current.clear();
        } catch {
          // ignore
        }
        qrScannerRef.current = null;
      }
      setIsScanning(false);
    };

    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [isScanning]);

  // Manejo de eventos de Arrastrar y Soltar (Drag & Drop)
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setActiveTab("FILE");
      processSelectedFile(files[0]);
    }
  };

  // Procesamiento unificado de archivos seleccionados o arrastrados directamente
  const processSelectedFile = async (file: File) => {
    setFileProcessing(true);
    setScannerError(null);
    setFileSuccessNotice(null);

    const rawName = file.name || "";
    const fileName = rawName.toLowerCase();

    // Recopilar seriales conocidos para detección automática en nombres de archivo
    const knownSerials = Array.from(
      new Set([
        ...Object.keys(OFFICIAL_CATALOG),
        ...(dbAssetsData?.assets?.items?.map((a: any) => a.serialNumber) || []),
      ])
    ).filter(Boolean);

    // Detección por nombre de archivo descargado (ej: "etiqueta-qr-FUS-90S-001.png" o con serial en el nombre)
    let detectedFromFilename: string | null = null;
    const tagMatch = rawName.match(/etiqueta-qr-([A-Za-z0-9-_]+)/i);
    if (tagMatch && tagMatch[1]) {
      const candidate = tagMatch[1].trim();
      const matched = knownSerials.find((s) => s.toUpperCase() === candidate.toUpperCase()) || candidate;
      detectedFromFilename = matched;
    } else {
      const matched = knownSerials.find((s) => fileName.includes(s.toLowerCase()));
      if (matched) detectedFromFilename = matched;
    }

    // 1. Archivo de imagen: escanear QR usando html5-qrcode y canvas crop
    if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|svg)$/i.test(fileName)) {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        let decoded: string | null = null;

        // Intento 1: Escanear la imagen directa completa
        try {
          const html5QrCode = new Html5Qrcode("qr-file-detector-temp");
          try {
            decoded = await html5QrCode.scanFile(file, false);
          } finally {
            try {
              html5QrCode.clear();
            } catch {
              // ignore
            }
          }
        } catch {
          decoded = null;
        }

        // Intento 2: Si la imagen completa no fue decodificada (por texto o composición de etiqueta), recortar el recuadro QR
        if (!decoded) {
          try {
            const croppedBlob = await extractQrRegionBlob(file);
            if (croppedBlob) {
              const html5QrCode = new Html5Qrcode("qr-file-detector-temp");
              try {
                const croppedFile = new File([croppedBlob], "cropped-qr.png", { type: "image/png" });
                decoded = await html5QrCode.scanFile(croppedFile, false);
              } finally {
                try {
                  html5QrCode.clear();
                } catch {
                  // ignore
                }
              }
            }
          } catch {
            // ignore
          }
        }

        // Si se decodificó exitosamente el QR óptico
        if (decoded) {
          const ok = lookupAsset(decoded, "ARCHIVO");
          if (ok) {
            setFileSuccessNotice(`Código QR detectado en la imagen: ${decoded}`);
            setFileProcessing(false);
            return;
          }
        }

        // Intento 3: Si falló la lectura óptica pero el archivo es una etiqueta oficial con serial en el nombre
        if (detectedFromFilename) {
          const ok = lookupAsset(detectedFromFilename, "ARCHIVO");
          if (ok) {
            setFileSuccessNotice(`Etiqueta oficial reconocida por archivo: ${detectedFromFilename}`);
            setFileProcessing(false);
            return;
          }
        }

        setScannerError(
          `No se detectó un código QR nítido en "${file.name}". Puedes arrastrar la etiqueta oficial o ingresar el serial manualmente.`
        );
      } catch (err: any) {
        if (detectedFromFilename) {
          lookupAsset(detectedFromFilename, "ARCHIVO");
          setFileSuccessNotice(`Equipo identificado por archivo: ${detectedFromFilename}`);
        } else {
          setScannerError("Error al procesar la imagen del código QR.");
        }
      }
    }
    // 2. Archivo de texto plano / CSV / código
    else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        const lines = text.split(/\r?\n/);

        let foundSerial: string | null = null;
        for (const line of lines) {
          const upper = line.toUpperCase();
          for (const serial of knownSerials) {
            if (upper.includes(serial.toUpperCase())) {
              foundSerial = serial;
              break;
            }
          }
          if (foundSerial) break;
        }

        if (foundSerial) {
          lookupAsset(foundSerial, "ARCHIVO");
          setFileSuccessNotice(`Serial extraído del archivo: ${foundSerial}`);
        } else if (lines[0]?.trim()) {
          lookupAsset(lines[0].trim(), "ARCHIVO");
        } else {
          setScannerError("No se encontraron seriales válidos en el archivo.");
        }
      };
      reader.readAsText(file);
    }

    setFileProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Manejo de carga de imágenes o archivos vía input file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      lookupAsset(manualCode, "MANUAL");
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Contenedor temporal oculto para decodificar imágenes de archivo */}
      <div
        id="qr-file-detector-temp"
        className="absolute -left-[9999px] -top-[9999px] w-[300px] h-[300px] opacity-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      />

      {/* Encabezado Principal */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#AFC8D0]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 flex items-center justify-center text-[#1995AD] shrink-0 shadow-xs">
            <QrCode className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-title text-3xl sm:text-4xl text-[#172B4D] tracking-tight">
              Escáner QR & Fichas Técnicas
            </h1>
            <p className="text-sm text-[#172B4D]/70 mt-0.5">
              Lectura con cámara en vivo, escaneo desde archivos o imágenes y almacenamiento de fichas de activos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#A1D6E2]/35 border border-[#1995AD]/40 text-xs font-bold text-[#172B4D]">
            <History className="h-4 w-4 text-[#1995AD]" />
            {scannedHistory.length} {scannedHistory.length === 1 ? "Ficha guardada" : "Fichas guardadas"}
          </span>
        </div>
      </div>

      {/* Grid de 2 Columnas: Lector/Cámara (Izq) y Ficha Técnica Activa (Der) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Modos de Captura (7 cols) */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="lg:col-span-7 bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-5 shadow-xs relative overflow-hidden"
        >
          {/* Superposición interactiva al arrastrar cualquier archivo o etiqueta QR */}
          {isDragging && (
            <div className="absolute inset-0 z-40 bg-[#172B4D]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white border-4 border-dashed border-[#A1D6E2] rounded-3xl animate-in fade-in duration-150">
              <div className="h-20 w-20 rounded-3xl bg-[#1995AD]/40 border-2 border-[#A1D6E2] flex items-center justify-center mb-3 animate-bounce">
                <QrCode className="h-10 w-10 text-[#A1D6E2]" />
              </div>
              <p className="font-title text-2xl font-black text-white">
                ¡Suelta aquí tu etiqueta QR descargada!
              </p>
              <p className="text-xs sm:text-sm text-[#A1D6E2] max-w-sm mt-1">
                AssetGuard leerá automáticamente el código o serial y desplegará la ficha técnica del equipo.
              </p>
            </div>
          )}
          {/* Pestañas de modo */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#F1F1F2] border border-[#AFC8D0]/40">
            <button
              type="button"
              onClick={() => {
                setActiveTab("CAMERA");
                setScannerError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "CAMERA"
                  ? "bg-white text-[#172B4D] shadow-xs"
                  : "text-[#172B4D]/70 hover:text-[#172B4D]"
              }`}
            >
              <Camera className="h-4 w-4 text-[#1995AD]" />
              <span>Cámara en Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("FILE");
                setIsScanning(false);
                setScannerError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "FILE"
                  ? "bg-white text-[#172B4D] shadow-xs"
                  : "text-[#172B4D]/70 hover:text-[#172B4D]"
              }`}
            >
              <Upload className="h-4 w-4 text-[#1995AD]" />
              <span>Subir Archivo / QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("MANUAL");
                setIsScanning(false);
                setScannerError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "MANUAL"
                  ? "bg-white text-[#172B4D] shadow-xs"
                  : "text-[#172B4D]/70 hover:text-[#172B4D]"
              }`}
            >
              <Package className="h-4 w-4 text-[#1995AD]" />
              <span>Ingreso Serial</span>
            </button>
          </div>

          {/* VISTA 1: CÁMARA EN VIVO */}
          {activeTab === "CAMERA" && (
            <div className="space-y-4">
              <div className="relative aspect-video w-full rounded-2xl bg-[#172B4D] border-2 border-dashed border-[#AFC8D0] flex flex-col items-center justify-center overflow-hidden">
                {/* Contenedor donde html5-qrcode inyecta el stream de video */}
                <div
                  id="qr-reader-container"
                  className={`w-full h-full object-cover ${!isScanning ? "hidden" : "block"}`}
                />

                {!isScanning && (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="relative h-28 w-28 border-2 border-[#A1D6E2] rounded-3xl flex items-center justify-center bg-white/5 backdrop-blur-xs shadow-inner">
                      <div className="absolute inset-0 border-2 border-[#1995AD] rounded-3xl animate-pulse opacity-40" />
                      <QrCode className="h-14 w-14 text-[#A1D6E2]" />
                    </div>
                    <p className="text-white text-xs sm:text-sm font-semibold max-w-xs">
                      Presiona el botón para activar la cámara de tu equipo y enfocar el código QR
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs sm:text-sm text-amber-800 flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsScanning(!isScanning)}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isScanning
                    ? "bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100"
                    : "bg-gradient-to-r from-[#1995AD] to-[#148296] text-white hover:opacity-95 hover:scale-[1.01]"
                }`}
              >
                {isScanning ? (
                  <>
                    <CameraOff className="h-5 w-5" /> Detener Cámara
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" /> Activar Cámara en Vivo
                  </>
                )}
              </button>
            </div>
          )}

          {/* VISTA 2: SUBIR IMAGEN O ARCHIVO */}
          {activeTab === "FILE" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-3 ${
                  isDragging
                    ? "border-[#1995AD] bg-[#A1D6E2]/35 scale-[1.01] ring-4 ring-[#1995AD]/20"
                    : "border-[#1995AD]/60 bg-[#F1F1F2]/60 hover:bg-[#A1D6E2]/20 hover:border-[#1995AD]"
                }`}
              >
                <div
                  className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all ${
                    isDragging
                      ? "bg-[#1995AD] text-white scale-110 shadow-md"
                      : "bg-[#1995AD]/15 text-[#1995AD]"
                  }`}
                >
                  <FileImage className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#172B4D]">
                    {isDragging
                      ? "¡Suelta la etiqueta QR aquí!"
                      : "Haz clic o arrastra aquí tu etiqueta QR descargada"}
                  </p>
                  <p className="text-xs text-[#172B4D]/60 mt-1">
                    Arrastra directamente etiquetas oficiales (.png) o imágenes con código QR
                  </p>
                </div>
                <span className="px-4 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-xs shadow-xs transition-colors">
                  {fileProcessing ? "Analizando código..." : "Seleccionar o Arrastrar Archivo"}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.txt,.csv,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              {fileSuccessNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs sm:text-sm text-emerald-800 flex items-center gap-2 font-bold">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{fileSuccessNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* VISTA 3: INGRESO MANUAL */}
          {activeTab === "MANUAL" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                  Número de Serie o Contenido QR
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ej: FUS-90S-001 o QR-FUS-90S-001"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border-2 border-[#AFC8D0] bg-[#F1F1F2]/60 focus:bg-white focus:outline-hidden focus:border-[#1995AD] text-sm font-mono uppercase"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-[#172B4D] hover:bg-[#1995AD] text-white text-sm font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Consultar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Errores de búsqueda */}
          {scannerError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs sm:text-sm text-red-700 flex items-center gap-2.5 font-semibold">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Catálogo de Acceso Rápido (1 clic) — Solo 5 más usados por defecto */}
          <div className="pt-2 border-t border-[#AFC8D0]/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B4D]/70 uppercase tracking-wider block">
                Pruebas Rápidas: 5 más usados
              </span>
              <button
                type="button"
                onClick={() => setShowAllTestSerials(!showAllTestSerials)}
                className="text-[11px] font-bold text-[#1995AD] hover:underline cursor-pointer"
              >
                {showAllTestSerials ? "Ver Top 5" : "Mostrar todos"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {(showAllTestSerials ? Object.keys(OFFICIAL_CATALOG) : TOP_5_MOST_USED_SERIALS).map((serial) => (
                <button
                  key={serial}
                  type="button"
                  onClick={() => lookupAsset(serial, "MANUAL")}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    scannedResult === serial
                      ? "bg-[#1995AD] text-white border-[#1995AD]"
                      : "bg-[#F1F1F2] text-[#172B4D] border-[#AFC8D0]/60 hover:bg-[#A1D6E2]/40"
                  }`}
                >
                  {serial}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Ficha Técnica Activa del Equipo (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#AFC8D0]/40 pb-3">
            <h2 className="font-title text-xl text-[#172B4D] flex items-center gap-2">
              <Package className="h-5 w-5 text-[#1995AD]" />
              Ficha del Equipo
            </h2>
            {scannedResult && (
              <span className="font-mono text-xs font-bold text-[#1995AD] bg-[#A1D6E2]/30 px-3 py-1 rounded-xl border border-[#1995AD]/40">
                {scannedResult}
              </span>
            )}
          </div>

          {assetDetails ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-[#1995AD] uppercase tracking-wider block">
                  {assetDetails.category}
                </span>
                <h3 className="text-2xl font-black text-[#172B4D] leading-tight mt-0.5">
                  {assetDetails.model}
                </h3>
              </div>

              {/* Grid de especificaciones de la ficha */}
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm bg-[#F1F1F2]/80 p-4 rounded-2xl border border-[#AFC8D0]/50">
                <div className="space-y-1">
                  <span className="text-[#172B4D]/60 block font-bold text-[11px] uppercase">
                    Disponibilidad
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      assetDetails.status === "AVAILABLE"
                        ? "bg-emerald-100 text-emerald-800"
                        : assetDetails.status === "ON_LOAN"
                        ? "bg-[#A1D6E2] text-[#172B4D]"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {assetDetails.status === "AVAILABLE"
                      ? "Disponible"
                      : assetDetails.status === "ON_LOAN"
                      ? "En Préstamo"
                      : "En Taller"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[#172B4D]/60 block font-bold text-[11px] uppercase">
                    Código QR
                  </span>
                  <span className="font-mono font-bold text-xs text-[#172B4D] truncate block">
                    {assetDetails.qrCode}
                  </span>
                </div>

                <div className="space-y-1 col-span-2 pt-1 border-t border-[#AFC8D0]/30">
                  <span className="text-[#172B4D]/60 block font-bold text-[11px] uppercase flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#1995AD]" /> Ubicación
                  </span>
                  <span className="font-semibold text-xs text-[#172B4D] block">
                    {assetDetails.location}
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-[#AFC8D0]/30">
                  <span className="text-[#172B4D]/60 block font-bold text-[11px] uppercase">
                    Ciclos de Uso
                  </span>
                  <span className="font-extrabold text-[#172B4D] block">
                    {assetDetails.cycles}
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-[#AFC8D0]/30">
                  <span className="text-[#172B4D]/60 block font-bold text-[11px] uppercase">
                    Calibración
                  </span>
                  <span className="font-semibold text-xs text-[#172B4D] block">
                    {assetDetails.calibration}
                  </span>
                </div>
              </div>

              {/* Valor Económico y Verificación */}
              <div className="bg-gradient-to-r from-[#A1D6E2]/30 to-[#1995AD]/15 border-2 border-[#1995AD]/40 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#172B4D]/70 uppercase block">
                    Valor Estimado
                  </span>
                  <span className="text-xl font-extrabold text-[#172B4D]">
                    {assetDetails.estimatedValue}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs">
                  <ShieldCheck className="h-4 w-4" /> Activo Certificado
                </div>
              </div>

              {/* Bloque Oficial de Generación y Descarga de Etiqueta QR */}
              <div className="bg-[#F1F1F2]/80 border-2 border-[#1995AD]/40 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-xs">
                {activeQrDataUrl ? (
                  <img
                    src={activeQrDataUrl}
                    alt={`Código QR ${assetDetails.serial}`}
                    className="h-28 w-28 rounded-xl border border-[#AFC8D0]/60 p-1.5 bg-white shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-xl bg-white border border-[#AFC8D0]/60 flex items-center justify-center shrink-0">
                    <QrCode className="h-10 w-10 text-[#1995AD]" />
                  </div>
                )}
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#1995AD] tracking-wider block">
                      ETIQUETA QR INDUSTRIAL
                    </span>
                    <h4 className="text-sm font-extrabold text-[#172B4D]">
                      Código QR: {assetDetails.qrCode}
                    </h4>
                    <p className="text-xs text-[#172B4D]/65 mt-0.5">
                      Generada dinámicamente con serial y metadatos oficiales para custodia física.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadQrTag(assetDetails)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Descargar Etiqueta QR (PNG)
                  </button>
                </div>
              </div>

              {/* Meta de escaneo */}
              <div className="flex items-center justify-between text-xs text-[#172B4D]/60 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#1995AD]" />
                  Hora: {assetDetails.scannedAt}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#F1F1F2] font-semibold">
                  Método: {assetDetails.scannedMethod}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-[#BCBABE] space-y-3">
              <QrCode className="h-16 w-16 mx-auto stroke-[1.2] text-[#AFC8D0]" />
              <p className="text-sm font-semibold text-[#172B4D]/60 max-w-xs mx-auto">
                Escanea con la cámara, sube una imagen con código QR o selecciona un serial de prueba para cargar la ficha técnica.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: Fichas Técnicas Almacenadas (Historial de Pruebas: 5 más usados) */}
      <div className="bg-white rounded-3xl border border-[#AFC8D0]/60 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#AFC8D0]/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-[#1995AD]/15 text-[#1995AD] flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-title text-xl text-[#172B4D]">Fichas Técnicas Almacenadas</h3>
                <span className="text-[11px] font-bold bg-[#A1D6E2]/40 text-[#172B4D] px-2.5 py-0.5 rounded-full border border-[#1995AD]/30">
                  5 más usados
                </span>
              </div>
              <p className="text-xs text-[#172B4D]/60 mt-0.5">
                Tarjetas de acceso rápido para pruebas: guarda solo 5 de los equipos más usados para consultar su ficha técnica o descargar su etiqueta QR en 1 clic.
              </p>
            </div>
          </div>

          {scannedHistory.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" /> Vaciar Historial
            </button>
          )}
        </div>

        {scannedHistory.length === 0 ? (
          <div className="py-10 text-center text-[#BCBABE]">
            <History className="h-10 w-10 mx-auto mb-2 text-[#AFC8D0]" />
            <p className="text-sm font-semibold text-[#172B4D]/60">
              Aún no hay fichas en el registro. Los equipos escaneados se guardarán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {scannedHistory.map((item) => {
              const isSelected = assetDetails?.serial === item.serial;

              return (
                <div
                  key={item.serial}
                  onClick={() => {
                    setAssetDetails(item);
                    setScannedResult(item.serial);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 text-left ${
                    isSelected
                      ? "border-2 border-[#1995AD] bg-[#A1D6E2]/15 shadow-sm"
                      : "border-[#AFC8D0]/60 bg-[#F1F1F2]/40 hover:border-[#1995AD] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1995AD] bg-white px-2 py-0.5 rounded-md border border-[#AFC8D0]/50">
                      {item.serial}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Descargar Etiqueta QR"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadQrTag(item);
                        }}
                        className="p-1 text-[#1995AD] hover:bg-[#A1D6E2]/30 rounded-lg cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar de historial"
                        onClick={(e) => handleRemoveHistoryItem(item.serial, e)}
                        className="p-1 text-[#BCBABE] hover:text-red-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-[#172B4D] line-clamp-1">{item.model}</h4>

                  <div className="flex items-center justify-between text-xs text-[#172B4D]/70 pt-1 border-t border-[#AFC8D0]/30">
                    <span className="font-extrabold text-[#1995AD]">{item.estimatedValue}</span>
                    <span className="text-[11px] text-[#172B4D]/60 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {item.scannedAt}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
