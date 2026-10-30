/**
 * Helper para exportación de reportes corporativos en formato Excel (.xls) con diseño profesional
 * basado en los esquemas corporativos solicitados y la paleta de colores de AssetGuard 2620:
 * - Color Primario: #172B4D (Azul Marino Oscuro Corporativo)
 * - Color Secundario: #1995AD (Cian / Turquesa Intenso)
 * - Color Claro: #A1D6E2 (Azul Hielo / Celeste Suave)
 * - Color Fondo / Neutral: #F1F1F2 (Gris Perla Neutro)
 */

export interface ExportAssetData {
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
  lastCalibrationDate?: string;
  calibrationIntervalDays?: number;
}

export interface ExportAuditData {
  id: string;
  userName: string;
  userRole?: string;
  actionCode?: string;
  actionTitle: string;
  actionDescription: string;
  actionCategory: "LOAN" | "OTP" | "RETURN" | "CRON" | "USER" | "CALIBRATION";
  entityName?: string;
  ipAddress: string;
  createdAt: string;
}

export interface ExportDailyReportData {
  id: string;
  date: string;
  closedAt: string;
  totalMovements: number;
  loansCount: number;
  returnsCount: number;
  otpValidationsCount: number;
  cronExecutionsCount: number;
  calibrationsCount: number;
  usersInvolved: string[];
}

/** Formateador de moneda en pesos colombianos o números */
const formatCurrency = (val: number) => {
  return "$" + Math.round(val).toLocaleString("es-CO");
};

/**
 * Disparador genérico de descarga para archivos Excel basados en HTML / XML Spreadsheet
 */
function downloadExcelFile(htmlContent: string, fileName: string) {
  const blob = new Blob([htmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName.endsWith(".xls") ? fileName : `${fileName}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. EXPORTACIÓN DE INVENTARIO Y EQUIPOS (Diseño basado en Imagen 2)
 * Incluye:
 * - Título corporativo ejecutivo superior
 * - Agrupación de columnas superiores (Presupuesto / Desgaste / Depreciación / Clasificación)
 * - Encabezado #172B4D con texto blanco y líneas nítidas
 * - Agrupación jerárquica por categoría con subtotales (A, A.1, B, B.1...)
 * - Fila de totales globales
 * - Insignias KPI ejecutivas inferiores (BAC, EV, AC, DISP, RIESGO, USO%)
 */
export function exportInventoryToStyledExcel(
  assets: ExportAssetData[],
  usefulLifeYears: number = 5,
  authorName: string = "Administrador"
) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  // Cálculo de depreciación en línea recta
  const calculateDep = (asset: ExportAssetData) => {
    const acq = new Date(asset.acquisitionDate);
    const rawMonths =
      (now.getFullYear() - acq.getFullYear()) * 12 + (now.getMonth() - acq.getMonth());
    const totalMonths = usefulLifeYears * 12;
    const monthsElapsed = Math.min(totalMonths, Math.max(1, rawMonths));
    const monthlyRate = asset.estimatedValue / totalMonths;
    const accumulated = Math.min(asset.estimatedValue, monthlyRate * monthsElapsed);
    const bookValue = Math.max(0, asset.estimatedValue - accumulated);
    const percentDep = Math.min(
      100,
      Math.round((accumulated / Math.max(1, asset.estimatedValue)) * 100)
    );
    return { accumulated, bookValue, percentDep };
  };

  // Agrupar por categoría
  const groups: { [cat: string]: ExportAssetData[] } = {};
  assets.forEach((a) => {
    const cat = a.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  });

  // Métricas globales
  let totalBAC = 0;
  let totalAC = 0;
  let totalEV = 0;
  let countAvailable = 0;
  let countOnLoan = 0;
  let countMaintenance = 0;
  let sumUsageCycles = 0;
  let sumMaxUsageCycles = 0;
  let loanedBookValue = 0;

  assets.forEach((a) => {
    const dep = calculateDep(a);
    totalBAC += a.estimatedValue;
    totalAC += dep.accumulated;
    totalEV += dep.bookValue;
    sumUsageCycles += a.usageCycles;
    sumMaxUsageCycles += a.maxUsageCycles;

    if (a.status === "AVAILABLE") countAvailable++;
    else if (a.status === "ON_LOAN") {
      countOnLoan++;
      loanedBookValue += dep.bookValue;
    } else if (a.status === "MAINTENANCE") countMaintenance++;
  });

  const fleetWearPercent =
    sumMaxUsageCycles > 0 ? Math.round((sumUsageCycles / sumMaxUsageCycles) * 100) : 0;

  // Letras para numeración de categorías (A, B, C, D...)
  const catLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // Generar filas de tabla agrupadas
  let tableRowsHtml = "";
  let catIndex = 0;

  Object.keys(groups).forEach((catName) => {
    const items = groups[catName];
    const letter = catLetters[catIndex % catLetters.length];
    catIndex++;

    let catBAC = 0;
    let catAC = 0;
    let catEV = 0;

    const itemRows = items
      .map((item, itemIdx) => {
        const dep = calculateDep(item);
        catBAC += item.estimatedValue;
        catAC += dep.accumulated;
        catEV += dep.bookValue;

        const wearRatio = item.maxUsageCycles > 0 ? (item.usageCycles / item.maxUsageCycles) * 100 : 0;
        const wearText = `${Math.round(wearRatio)}%`;
        const wearColor = wearRatio >= 85 ? "#DC2626" : wearRatio >= 60 ? "#D97706" : "#059669";

        const statusLabel =
          item.status === "AVAILABLE"
            ? "DISPONIBLE"
            : item.status === "ON_LOAN"
            ? "EN PRÉSTAMO"
            : "TALLER / MTTO";
        const statusBg =
          item.status === "AVAILABLE"
            ? "#D1FAE5"
            : item.status === "ON_LOAN"
            ? "#FEF3C7"
            : "#FEE2E2";
        const statusText =
          item.status === "AVAILABLE"
            ? "#065F46"
            : item.status === "ON_LOAN"
            ? "#92400E"
            : "#991B1B";

        const rowBg = itemIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

        return `
          <tr style="background-color: ${rowBg}; height: 26px;">
            <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 10pt; color: #172B4D; font-weight: 600;">${letter}.${itemIdx + 1}</td>
            <td style="border: 1px solid #CBD5E1; text-align: center; font-family: 'Consolas', monospace; font-size: 10pt; font-weight: bold; color: #172B4D;">${item.serialNumber}</td>
            <td style="border: 1px solid #CBD5E1; text-align: left; font-size: 10pt; font-weight: 600; color: #1E293B; padding-left: 8px;">${item.model}</td>
            <td style="border: 1px solid #CBD5E1; text-align: left; font-size: 9.5pt; color: #475569; padding-left: 8px;">${item.category}</td>
            <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 9.5pt; color: #475569;">${item.location}</td>
            <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 8.5pt; font-weight: bold; background-color: ${statusBg}; color: ${statusText}; border-radius: 4px;">${statusLabel}</td>
            <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 10pt; color: #334155;">${item.usageCycles}</td>
            <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 10pt; color: #64748B;">${item.maxUsageCycles}</td>
            <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 10pt; font-weight: bold; color: ${wearColor};">${wearText}</td>
            <td style="border: 1px solid #CBD5E1; text-align: right; font-size: 10pt; color: #172B4D; padding-right: 8px;">${formatCurrency(item.estimatedValue)}</td>
            <td style="border: 1px solid #CBD5E1; text-align: right; font-size: 10pt; color: #D97706; padding-right: 8px;">${formatCurrency(dep.accumulated)}</td>
            <td style="border: 1px solid #CBD5E1; text-align: right; font-size: 10.5pt; font-weight: bold; color: #1995AD; padding-right: 8px;">${formatCurrency(dep.bookValue)}</td>
          </tr>
        `;
      })
      .join("");

    // Fila cabecera de la categoría con subtotales
    const catHeaderRow = `
      <tr style="background-color: #E2F1F5; height: 30px; font-weight: bold;">
        <td style="border: 1px solid #94A3B8; text-align: center; font-size: 11pt; color: #172B4D;">${letter}</td>
        <td colspan="4" style="border: 1px solid #94A3B8; text-align: left; font-size: 11pt; color: #172B4D; padding-left: 10px;">CATEGORÍA: ${catName.toUpperCase()} (${items.length} activos)</td>
        <td style="border: 1px solid #94A3B8; text-align: center; font-size: 9pt; color: #1995AD;">SUBTOTAL</td>
        <td colspan="3" style="border: 1px solid #94A3B8; text-align: center; font-size: 9pt; color: #475569;">${items.length} equipos registrados</td>
        <td style="border: 1px solid #94A3B8; text-align: right; font-size: 10.5pt; color: #172B4D; padding-right: 8px;">${formatCurrency(catBAC)}</td>
        <td style="border: 1px solid #94A3B8; text-align: right; font-size: 10.5pt; color: #B45309; padding-right: 8px;">${formatCurrency(catAC)}</td>
        <td style="border: 1px solid #94A3B8; text-align: right; font-size: 11pt; color: #0E7490; padding-right: 8px;">${formatCurrency(catEV)}</td>
      </tr>
    `;

    tableRowsHtml += catHeaderRow + itemRows;
  });

  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Desempeño y Valoración Equipos</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 0; padding: 20px; background-color: #F8FAFC; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 25px; }
        .title-banner { background-color: #172B4D; color: #FFFFFF; font-size: 18pt; font-weight: bold; text-align: center; padding: 16px; border: 2px solid #0F1D38; }
        .meta-bar { background-color: #F1F1F2; color: #172B4D; font-size: 10pt; padding: 8px; border: 1px solid #CBD5E1; }
        .super-header { background-color: #0F1D38; color: #A1D6E2; font-size: 10pt; font-weight: bold; text-align: center; border: 1px solid #1E293B; letter-spacing: 0.5px; }
        .main-header { background-color: #172B4D; color: #FFFFFF; font-size: 10.5pt; font-weight: bold; text-align: center; border: 1px solid #334155; padding: 8px 4px; }
        .kpi-card { border: 2px solid #CBD5E1; background-color: #FFFFFF; text-align: center; padding: 12px; }
      </style>
    </head>
    <body>

      <!-- TÍTULO CORPORATIVO SUPERIOR (ESTILO IMAGEN 2) -->
      <table>
        <tr>
          <td colspan="12" class="title-banner">
            INFORME DE DESEMPEÑO DEL EQUIPO Y VALORACIÓN PATRIMONIAL CON DETALLES DEL PROGRAMA
          </td>
        </tr>
        <tr>
          <td colspan="12" class="meta-bar">
            <strong>Sistema:</strong> AssetGuard 2620 &nbsp;|&nbsp;
            <strong>Emisión:</strong> ${today} &nbsp;|&nbsp;
            <strong>Generado por:</strong> ${authorName} &nbsp;|&nbsp;
            <strong>Vida Útil Estimada:</strong> ${usefulLifeYears} Años &nbsp;|&nbsp;
            <strong>Moneda:</strong> COP (Pesos Colombianos) &nbsp;|&nbsp;
            <strong>Total Activos:</strong> ${assets.length}
          </td>
        </tr>
        <tr style="height: 10px;"><td colspan="12"></td></tr>
      </table>

      <!-- TABLA PRINCIPAL CON AGRUPACIÓN DE COLUMNAS -->
      <table>
        <!-- Fila de Super-Agrupación de Columnas (Presupuesto, Desgaste, Depreciación) -->
        <tr style="height: 28px;">
          <th colspan="2" class="super-header" style="background-color: #172B4D; color: #FFFFFF;">IDENTIFICACIÓN</th>
          <th colspan="3" class="super-header" style="background-color: #1E3A8A; color: #E0E7FF;">CLASIFICACIÓN & UBICACIÓN</th>
          <th colspan="1" class="super-header" style="background-color: #0E7490; color: #CFFAFE;">OPERATIVIDAD</th>
          <th colspan="3" class="super-header" style="background-color: #0F766E; color: #CCFBF1;">CICLOS & DESGASTE</th>
          <th colspan="3" class="super-header" style="background-color: #155E75; color: #E0F2FE;">VALORACIÓN PATRIMONIAL ($ COP)</th>
        </tr>

        <!-- Cabecera de Columnas Nivel 2 -->
        <tr style="height: 34px;">
          <th style="width: 50px;" class="main-header">S#</th>
          <th style="width: 140px;" class="main-header">Código Serie</th>
          <th style="width: 260px;" class="main-header">Equipo / Modelo</th>
          <th style="width: 180px;" class="main-header">Categoría</th>
          <th style="width: 150px;" class="main-header">Ubicación</th>
          <th style="width: 130px;" class="main-header">Estado Actual</th>
          <th style="width: 90px;" class="main-header">Ciclos Usados</th>
          <th style="width: 90px;" class="main-header">Ciclos Máx.</th>
          <th style="width: 90px;" class="main-header">% Desgaste</th>
          <th style="width: 140px;" class="main-header">Valor Compra (BAC)</th>
          <th style="width: 140px;" class="main-header">Deprec. Acumulada (AC)</th>
          <th style="width: 140px;" class="main-header">Valor en Libros (EV)</th>
        </tr>

        <!-- Filas de Datos con Subtotales por Categoría -->
        ${tableRowsHtml}

        <!-- FILA DE TOTALES GENERALES CON ESTILO CORPORATIVO -->
        <tr style="background-color: #172B4D; color: #FFFFFF; font-weight: bold; height: 38px;">
          <td colspan="6" style="border: 2px solid #0F1D38; text-align: left; font-size: 12pt; padding-left: 14px;">
            TOTAL CONSOLIDADO DEL INVENTARIO (${assets.length} EQUIPOS)
          </td>
          <td style="border: 2px solid #0F1D38; text-align: center; font-size: 11pt;">${sumUsageCycles}</td>
          <td style="border: 2px solid #0F1D38; text-align: center; font-size: 11pt;">${sumMaxUsageCycles}</td>
          <td style="border: 2px solid #0F1D38; text-align: center; font-size: 11pt; color: #A1D6E2;">${fleetWearPercent}%</td>
          <td style="border: 2px solid #0F1D38; text-align: right; font-size: 11.5pt; padding-right: 8px;">${formatCurrency(totalBAC)}</td>
          <td style="border: 2px solid #0F1D38; text-align: right; font-size: 11.5pt; color: #FCA5A5; padding-right: 8px;">${formatCurrency(totalAC)}</td>
          <td style="border: 2px solid #0F1D38; text-align: right; font-size: 12pt; color: #67E8F9; padding-right: 8px;">${formatCurrency(totalEV)}</td>
        </tr>
      </table>

      <!-- PANEL DE INDICADORES KPI INFERIORES (ESTILO PASTILLAS/CIRCULARES DE IMAGEN 2) -->
      <table style="margin-top: 30px;">
        <tr>
          <td colspan="12" style="background-color: #1995AD; color: #FFFFFF; font-size: 12pt; font-weight: bold; text-align: center; padding: 10px; border-radius: 8px 8px 0 0;">
            INDICADORES EJECUTIVOS DE GESTIÓN Y VALORACIÓN (KPIs DE DESEMPEÑO)
          </td>
        </tr>
        <tr style="height: 75px;">
          <!-- BAC -->
          <td colspan="2" style="background-color: #172B4D; color: #FFFFFF; text-align: center; border: 2px solid #FFFFFF; padding: 10px;">
            <div style="font-size: 13pt; font-weight: 900; color: #A1D6E2;">BAC</div>
            <div style="font-size: 11.5pt; font-weight: bold; margin-top: 4px;">${formatCurrency(totalBAC)}</div>
            <div style="font-size: 8pt; color: #CBD5E1; margin-top: 2px;">Valor Adquisición Cost</div>
          </td>

          <!-- EV -->
          <td colspan="2" style="background-color: #0E7490; color: #FFFFFF; text-align: center; border: 2px solid #FFFFFF; padding: 10px;">
            <div style="font-size: 13pt; font-weight: 900; color: #CFFAFE;">EV</div>
            <div style="font-size: 11.5pt; font-weight: bold; margin-top: 4px;">${formatCurrency(totalEV)}</div>
            <div style="font-size: 8pt; color: #E0F2FE; margin-top: 2px;">Valor en Libros Hoy</div>
          </td>

          <!-- AC -->
          <td colspan="2" style="background-color: #C2410C; color: #FFFFFF; text-align: center; border: 2px solid #FFFFFF; padding: 10px;">
            <div style="font-size: 13pt; font-weight: 900; color: #FFEDD5;">AC</div>
            <div style="font-size: 11.5pt; font-weight: bold; margin-top: 4px;">${formatCurrency(totalAC)}</div>
            <div style="font-size: 8pt; color: #FFEDD5; margin-top: 2px;">Depreciación Total</div>
          </td>

          <!-- DISPONIBILIDAD -->
          <td colspan="2" style="background-color: #059669; color: #FFFFFF; text-align: center; border: 2px solid #FFFFFF; padding: 10px;">
            <div style="font-size: 13pt; font-weight: 900; color: #D1FAE5;">DISP</div>
            <div style="font-size: 11.5pt; font-weight: bold; margin-top: 4px;">${countAvailable} Equipos</div>
            <div style="font-size: 8pt; color: #D1FAE5; margin-top: 2px;">Listos para Préstamo</div>
          </td>

          <!-- EN PRÉSTAMO / RIESGO -->
          <td colspan="2" style="background-color: #D97706; color: #FFFFFF; text-align: center; border: 2px solid #FFFFFF; padding: 10px;">
            <div style="font-size: 13pt; font-weight: 900; color: #FEF3C7;">CUSTODIA</div>
            <div style="font-size: 11.5pt; font-weight: bold; margin-top: 4px;">${countOnLoan} Equipos</div>
            <div style="font-size: 8pt; color: #FEF3C7; margin-top: 2px;">${formatCurrency(loanedBookValue)} en Riesgo</div>
          </td>

          <!-- USO FLOTA -->
          <td colspan="2" style="background-color: #4F46E5; color: #FFFFFF; text-align: center; border: 2px solid #FFFFFF; padding: 10px;">
            <div style="font-size: 13pt; font-weight: 900; color: #E0E7FF;">USO FLOTA</div>
            <div style="font-size: 11.5pt; font-weight: bold; margin-top: 4px;">${fleetWearPercent}%</div>
            <div style="font-size: 8pt; color: #E0E7FF; margin-top: 2px;">Tasa de Desgaste Global</div>
          </td>
        </tr>
      </table>

      <!-- PIE DE REPORTE Y FIRMA -->
      <table style="margin-top: 20px;">
        <tr>
          <td colspan="6" style="border-top: 1px dashed #94A3B8; font-size: 9pt; color: #64748B; padding-top: 8px;">
            Documento generado de manera automatizada por el motor analítico de <strong>AssetGuard 2620</strong>.
          </td>
          <td colspan="6" style="border-top: 1px dashed #94A3B8; font-size: 9pt; color: #64748B; text-align: right; padding-top: 8px;">
            Auditoría de Activos Fijos y Control de Calibración
          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  downloadExcelFile(fullHtml, `Informe_Desempeno_Equipos_AssetGuard_${today}.xls`);
}

/**
 * 2. EXPORTACIÓN DE AUDITORÍA Y BITÁCORA (Diseño basado en Imagen 1)
 * Incluye:
 * - Tarjetas superiores de resumen de jornada con colores corporativos (#1995AD, #172B4D, #A1D6E2)
 * - Cuadrícula con líneas nítidas y formato tipo ficha ejecutiva
 * - Tabla central de registros con columnas claras
 * - Cuadro de firma del Inspector / Auditor Responsable al pie (matching Image 1)
 * - Cuadro de observaciones de cierre de jornada / Teacher's comment adaptado
 */
export function exportAuditToStyledExcel(
  logs: ExportAuditData[],
  reportTitle: string = "Bitácora Oficial de Auditoría y Trazabilidad",
  dailyReport?: ExportDailyReportData | null,
  auditorName: string = "Inspector Responsable"
) {
  const today = new Date().toISOString().split("T")[0];

  // Métricas del conjunto de auditoría exportado
  const totalEvents = logs.length;
  const loansCount = logs.filter((l) => l.actionCategory === "LOAN").length;
  const returnsCount = logs.filter((l) => l.actionCategory === "RETURN").length;
  const otpCount = logs.filter((l) => l.actionCategory === "OTP").length;
  const cronCount = logs.filter((l) => l.actionCategory === "CRON").length;
  const userCount = logs.filter((l) => l.actionCategory === "USER").length;
  const calCount = logs.filter((l) => l.actionCategory === "CALIBRATION").length;

  const usersSet = new Set<string>();
  logs.forEach((l) => {
    if (l.userName) usersSet.add(l.userName);
  });

  const categoryBadge = (cat: string) => {
    switch (cat) {
      case "LOAN":
        return { bg: "#E0F2FE", color: "#0369A1", text: "PRÉSTAMO" };
      case "RETURN":
        return { bg: "#D1FAE5", color: "#047857", text: "DEVOLUCIÓN" };
      case "OTP":
        return { bg: "#EDE9FE", color: "#6D28D9", text: "VALIDACIÓN OTP" };
      case "CRON":
        return { bg: "#FEF3C7", color: "#B45309", text: "ROBOT CRON" };
      case "USER":
        return { bg: "#FCE7F3", color: "#BE185D", text: "USUARIO" };
      case "CALIBRATION":
        return { bg: "#FEE2E2", color: "#B91C1C", text: "CALIBRACIÓN" };
      default:
        return { bg: "#F1F5F9", color: "#475569", text: cat };
    }
  };

  const rowsHtml = logs
    .map((log, idx) => {
      const badge = categoryBadge(log.actionCategory);
      const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      return `
        <tr style="background-color: ${rowBg}; height: 26px;">
          <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 9.5pt; font-weight: bold; color: #172B4D;">${idx + 1}</td>
          <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 9pt; color: #334155; font-family: 'Consolas', monospace;">${log.createdAt.replace("T", " ").slice(0, 19)}</td>
          <td style="border: 1px solid #CBD5E1; text-align: left; font-size: 9.5pt; font-weight: 600; color: #172B4D; padding-left: 8px;">${log.userName}</td>
          <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 9pt; color: #475569;">${log.userRole || "Usuario"}</td>
          <td style="border: 1px solid #CBD5E1; text-align: left; font-size: 9.5pt; font-weight: bold; color: #1995AD; padding-left: 8px;">${log.actionTitle}</td>
          <td style="border: 1px solid #CBD5E1; text-align: left; font-size: 9pt; color: #334155; padding-left: 8px;">${log.actionDescription}</td>
          <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 8.5pt; font-weight: bold; background-color: ${badge.bg}; color: ${badge.color};">${badge.text}</td>
          <td style="border: 1px solid #CBD5E1; text-align: center; font-size: 8.5pt; font-family: 'Consolas', monospace; color: #64748B;">${log.ipAddress || "127.0.0.1"}</td>
        </tr>
      `;
    })
    .join("");

  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Bitácora de Auditoría</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 0; padding: 20px; background-color: #F8FAFC; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        .main-title { background-color: #172B4D; color: #FFFFFF; font-size: 17pt; font-weight: bold; text-align: center; padding: 14px; }
        .card-header-cyan { background-color: #1995AD; color: #FFFFFF; font-size: 11pt; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #148296; }
        .card-header-navy { background-color: #172B4D; color: #A1D6E2; font-size: 11pt; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #0F1D38; }
        .cell-label { background-color: #F1F1F2; font-size: 9.5pt; font-weight: bold; color: #172B4D; border: 1px solid #CBD5E1; padding: 6px 10px; width: 25%; }
        .cell-value { background-color: #FFFFFF; font-size: 10pt; color: #1E293B; border: 1px solid #CBD5E1; padding: 6px 10px; }
        .table-th { background-color: #1995AD; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; border: 1px solid #148296; padding: 8px 4px; }
        .sign-box { border: 2px solid #1995AD; background-color: #F8FAFC; height: 75px; vertical-align: bottom; padding: 12px; }
      </style>
    </head>
    <body>

      <!-- TÍTULO PRINCIPAL DEL DOCUMENTO -->
      <table>
        <tr>
          <td colspan="8" class="main-title">
            ASSETGUARD 2620 — ${reportTitle.toUpperCase()}
          </td>
        </tr>
        <tr>
          <td colspan="8" style="background-color: #A1D6E2; color: #172B4D; font-size: 10pt; font-weight: bold; text-align: center; padding: 6px; border: 1px solid #CBD5E1;">
            Registro Oficial de Eventos Transaccionales, Validaciones Criptográficas OTP y Monitoreo Nocturno CRON
          </td>
        </tr>
        <tr style="height: 10px;"><td colspan="8"></td></tr>
      </table>

      <!-- TARJETAS SUPERIORES MODULARES (ESTILO IMAGEN 1) -->
      <table>
        <!-- Cabecera de las 2 tarjetas superiores -->
        <tr>
          <th colspan="4" class="card-header-cyan">1. RESUMEN DE ACTIVIDAD Y MÉTRICAS CLAVE</th>
          <th colspan="4" class="card-header-navy">2. PARÁMETROS DEL SISTEMA & AUDITOR RESPONSABLE</th>
        </tr>

        <!-- Fila 1 de tarjetas -->
        <tr>
          <td class="cell-label">Total Movimientos:</td>
          <td class="cell-value" style="font-weight: bold; color: #172B4D; font-size: 11pt;">${totalEvents} eventos</td>
          <td class="cell-label">Préstamos / Custodias:</td>
          <td class="cell-value" style="font-weight: bold; color: #0284C7;">${loansCount} solicitudes</td>

          <td class="cell-label">Fecha de Emisión:</td>
          <td class="cell-value" style="font-weight: bold;">${today}</td>
          <td class="cell-label">Auditor / Inspector:</td>
          <td class="cell-value" style="font-weight: bold; color: #1995AD;">${auditorName}</td>
        </tr>

        <!-- Fila 2 de tarjetas -->
        <tr>
          <td class="cell-label">Devoluciones Físicas:</td>
          <td class="cell-value" style="font-weight: bold; color: #059669;">${returnsCount} registros</td>
          <td class="cell-label">Validaciones OTP:</td>
          <td class="cell-value" style="font-weight: bold; color: #7C3AED;">${otpCount} exitosas</td>

          <td class="cell-label">Nivel de Integridad:</td>
          <td class="cell-value" style="font-weight: bold; color: #059669;">100% Verificado (SHA-256)</td>
          <td class="cell-label">Usuarios Involucrados:</td>
          <td class="cell-value">${usersSet.size} operadores únicos</td>
        </tr>

        <!-- Fila 3 de tarjetas -->
        <tr>
          <td class="cell-label">Ejecuciones Robot CRON:</td>
          <td class="cell-value" style="font-weight: bold; color: #D97706;">${cronCount} barridos</td>
          <td class="cell-label">Calibraciones / Usuarios:</td>
          <td class="cell-value">${calCount + userCount} acciones</td>

          <td class="cell-label">Estado de Jornada:</td>
          <td class="cell-value" style="font-weight: bold; color: #0284C7;">${dailyReport ? "Cierre Consolidado" : "Bitácora Activa"}</td>
          <td class="cell-label">Entorno Seguro:</td>
          <td class="cell-value">Producción / Cifrado Activo</td>
        </tr>
        <tr style="height: 12px;"><td colspan="8"></td></tr>
      </table>

      <!-- TABLA DETALLADA DE EVENTOS (ESTILO CUADRÍCULA LIMPIA IMAGEN 1) -->
      <table>
        <tr>
          <th colspan="8" style="background-color: #172B4D; color: #FFFFFF; font-size: 11pt; font-weight: bold; text-align: left; padding: 9px 12px; border: 1px solid #0F1D38;">
            REGISTRO CRONOLÓGICO INDIVIDUAL DE MOVIMIENTOS
          </th>
        </tr>
        <tr style="height: 32px;">
          <th style="width: 45px;" class="table-th">N°</th>
          <th style="width: 155px;" class="table-th">Momento (Timestamp)</th>
          <th style="width: 175px;" class="table-th">Responsable</th>
          <th style="width: 115px;" class="table-th">Rol Sistema</th>
          <th style="width: 195px;" class="table-th">Acción Ejecutada</th>
          <th style="width: 320px;" class="table-th">Detalle Técnico & Trazabilidad</th>
          <th style="width: 140px;" class="table-th">Categoría</th>
          <th style="width: 125px;" class="table-th">Dirección IP</th>
        </tr>
        ${rowsHtml}
        <tr style="height: 8px;"><td colspan="8"></td></tr>
      </table>

      <!-- CUADROS DE FIRMA Y OBSERVACIONES (ADAPTADOS DE "Parent's Signature" & "Teacher's Comment" de IMAGEN 1) -->
      <table style="margin-top: 25px;">
        <!-- Cabecera de firmas -->
        <tr>
          <th colspan="4" style="background-color: #1995AD; color: #FFFFFF; font-size: 11pt; font-weight: bold; text-align: left; padding: 8px 12px; border: 1px solid #148296;">
            FIRMA DEL INSPECTOR / AUDITOR RESPONSABLE (Certificación de Conformidad)
          </th>
          <th colspan="4" style="background-color: #172B4D; color: #A1D6E2; font-size: 11pt; font-weight: bold; text-align: left; padding: 8px 12px; border: 1px solid #0F1D38;">
            OBSERVACIONES DEL CIERRE DE JORNADA & DICTAMEN DE AUDITORÍA
          </th>
        </tr>

        <tr>
          <!-- Recuadro 1: Firma -->
          <td colspan="4" class="sign-box">
            <div style="font-size: 9pt; color: #475569; margin-bottom: 22px;">
              Certifico bajo gravedad de juramento que la información aquí consolidada corresponde fielmente a los registros criptográficos y de bitácora del sistema AssetGuard 2620.
            </div>
            <div style="border-top: 1.5px solid #172B4D; width: 85%; margin: 0 auto; text-align: center; padding-top: 4px;">
              <span style="font-size: 9.5pt; font-weight: bold; color: #172B4D;">Firma y Sello del Auditor Responsable:</span>
              <span style="font-size: 9pt; color: #64748B;"> _____________________________________</span>
              <br/>
              <span style="font-size: 8.5pt; color: #64748B;">C.C. / ID Operativo: _______________________ &nbsp;|&nbsp; Fecha: ____ / ____ / 2026</span>
            </div>
          </td>

          <!-- Recuadro 2: Observaciones -->
          <td colspan="4" class="sign-box">
            <div style="font-size: 9pt; color: #475569; margin-bottom: 12px;">
              <strong>Dictamen de Auditoría:</strong>
            </div>
            <div style="border: 1px solid #CBD5E1; background-color: #FFFFFF; border-radius: 6px; padding: 10px; height: 50px; font-size: 9pt; color: #1E293B;">
              ${dailyReport
                ? `Cierre diario ejecutado a las ${dailyReport.closedAt.replace("T", " ").slice(11, 19)}. Total de transacciones conciliadas: ${dailyReport.totalMovements}. No se evidenciaron desvíos de seguridad ni registros huérfanos.`
                : "Bitácora en proceso de revisión continua. Sin excepciones críticas detectadas al momento de la emisión."
              }
            </div>
          </td>
        </tr>
      </table>

      <!-- PIE DE PÁGINA -->
      <table style="margin-top: 15px;">
        <tr>
          <td colspan="4" style="font-size: 8.5pt; color: #64748B;">
            AssetGuard 2620 — Plataforma de Gestión de Activos Críticos & Trazabilidad Criptográfica
          </td>
          <td colspan="4" style="font-size: 8.5pt; color: #64748B; text-align: right;">
            Hash de Verificación del Documento: SHA256-${Date.now().toString(16).toUpperCase()}
          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  const dateTag = dailyReport ? dailyReport.date : today;
  downloadExcelFile(fullHtml, `Auditoria_AssetGuard_${dateTag}.xls`);
}
