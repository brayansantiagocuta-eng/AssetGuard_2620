const fs = require("node:fs");
const path = require("node:path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  PageBreak,
} = require("C:/Users/maria/OneDrive/Escritorio/AssetGuard_2620/frontend/node_modules/docx");

// Paleta corporativa AssetGuard
const primaryTeal = "1995AD";
const darkNavy = "172B4D";
const accentCyan = "A1D6E2";
const lightBg = "F4F7F9";
const white = "FFFFFF";
const successGreen = "107C41";
const textDark = "24292F";
const borderColor = "CFD8DC";

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
  left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
  right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
};

function createHeaderCell(text, widthPercent, align = AlignmentType.CENTER) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: darkNavy, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: true,
            color: white,
            size: 20, // 10pt
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function createSubheaderCell(text, widthPercent) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: primaryTeal, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    columnSpan: 5,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: true,
            color: white,
            size: 20,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function createDataCell(text, widthPercent, options = {}) {
  const {
    isBold = false,
    align = AlignmentType.LEFT,
    color = textDark,
    bgColor = null,
    size = 18, // 9pt
  } = options;

  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: bgColor ? { fill: bgColor, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: isBold,
            color,
            size,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function createTitle(text, subtitle = null) {
  const paras = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text,
          bold: true,
          size: 32, // 16pt
          color: darkNavy,
          font: "Calibri",
        }),
      ],
    }),
  ];

  if (subtitle) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: subtitle,
            bold: true,
            size: 22, // 11pt
            color: primaryTeal,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  paras.push(new Paragraph({ text: "" }));
  return paras;
}

function createSectionHeader(title) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 24, // 12pt
          color: darkNavy,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];
}

// -------------------------------------------------------------
// DEFINICIÓN DE ENTREGABLES DEL RETO Y MATRIZ DE RÚBRICA
// -------------------------------------------------------------
const deliverablesData = [
  // EJE 1
  {
    category: "EJE 1: INGENIERÍA DE SOFTWARE Y ESPECIFICACIÓN DE REQUISITOS (15%)",
    items: [
      {
        code: "ENT-01",
        title: "24 Historias de Usuario BDD (Gherkin)",
        desc: "24 HU completas con criterios Dado / Cuando / Entonces, complejidad, rol beneficiario y tareas técnicas de desarrollo.",
        evidence: "Documento maestro HISTORIAS_DE_USUARIO_ASSETGUARD_2620.docx y suite BDD HU-001 a HU-024.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-02",
        title: "Matriz de 16 Requerimientos Funcionales (RF)",
        desc: "Especificación detallada de RF-001 a RF-016 (autenticación, inventario, calibración, préstamos, auditoría y CRON).",
        evidence: "Documento ESPECIFICACION_REQUERIMIENTOS_RF_RNF_ASSETGUARD_2620.docx y backend Spring Boot.",
        weight: "4.0%",
        score: "4.0 / 4.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-03",
        title: "12 Requerimientos No Funcionales (RNF)",
        desc: "Definición cuantitativa de seguridad, tiempo de respuesta (<200ms), disponibilidad 99.9%, integridad y concurrencia.",
        evidence: "Documento técnico RNF-001 a RNF-012, configuración BCrypt, cookies HttpOnly y pruebas de carga.",
        weight: "3.0%",
        score: "3.0 / 3.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-04",
        title: "Modelado Arquitectónico y Diagramas",
        desc: "Diagramas formales de Casos de Uso UML, Diagramas de Clases, Secuencia, BPMN 2.0 y Modelo Entidad-Relación.",
        evidence: "ARQUITECTURA_Y_CASOS_DE_USO_ASSETGUARD_2620.docx y carpeta de diagramas vectoriales.",
        weight: "3.0%",
        score: "3.0 / 3.0",
        status: "100% CUMPLIDO",
      },
    ],
  },
  // EJE 2
  {
    category: "EJE 2: ARQUITECTURA MONOREPO Y GESTIÓN DE CONFIGURACIÓN (10%)",
    items: [
      {
        code: "ENT-05",
        title: "Estructura Monorepo Desacoplada",
        desc: "Organización limpia en backend/, frontend/ y database/, respetando separación de responsabilidades y modularidad.",
        evidence: "Raíz del repositorio AssetGuard_2620, package.json central y pom.xml independiente.",
        weight: "4.0%",
        score: "4.0 / 4.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-06",
        title: "Control de Dependencias Estricto (pnpm y Maven)",
        desc: "Uso exclusivo de pnpm con lockfile congelado (--frozen-lockfile) en frontend y Maven Wrapper en backend.",
        evidence: "pnpm-lock.yaml, frontend/package.json, backend/mvnw y backend/pom.xml.",
        weight: "3.0%",
        score: "3.0 / 3.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-07",
        title: "Gestión Segura de Entorno y Secretos",
        desc: "Configuración mediante variables de entorno .env desacopladas de Git con plantilla .env.example documentada.",
        evidence: ".env.example, .gitignore protegiendo credenciales y lectura segura en Spring Boot / Next.js.",
        weight: "3.0%",
        score: "3.0 / 3.0",
        status: "100% CUMPLIDO",
      },
    ],
  },
  // EJE 3
  {
    category: "EJE 3: BASE DE DATOS RELACIONAL Y PERSISTENCIA (15%)",
    items: [
      {
        code: "ENT-08",
        title: "Modelo Relacional Normalizado en PostgreSQL",
        desc: "Tablas normalizadas (3FN) con integridad referencial, claves foráneas ON DELETE RESTRICT e índices optimizados.",
        evidence: "Tablas users, roles, assets, categories, locations, loans, loan_requests, audit_logs, job_executions.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-09",
        title: "Migraciones Automatizadas con Flyway",
        desc: "Ciclo evolutivo de migraciones versionadas V1__initial_schema a V4__password_reset_tokens ejecutadas al arranque.",
        evidence: "backend/src/main/resources/db/migration/ y tabla flyway_schema_history.",
        weight: "4.0%",
        score: "4.0 / 4.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-10",
        title: "Script Idempotente y Catálogo de 15 Equipos",
        desc: "Script idempotente assetguard_schema_and_seeds.sql sin comandos destructivos (DROP/TRUNCATE) y 15 equipos oficiales.",
        evidence: "database/assetguard_schema_and_seeds.sql y sincronización en AssetRepository.java.",
        weight: "6.0%",
        score: "6.0 / 6.0",
        status: "100% CUMPLIDO",
      },
    ],
  },
  // EJE 4
  {
    category: "EJE 4: BACKEND EMPRESARIAL SPRING BOOT & GRAPHQL (25%)",
    items: [
      {
        code: "ENT-11",
        title: "API GraphQL Tipada y Consultas Paginadas",
        desc: "Contrato GraphQL robusto en schema.graphqls con paginación real mediante LIMIT ? OFFSET ? y objeto PageInfo.",
        evidence: "AssetGraphQlController.java, PageQuery.java, AssetRepository.java (SELECT LIMIT ? OFFSET ?).",
        weight: "6.0%",
        score: "6.0 / 6.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-12",
        title: "Seguridad y Control de Acceso RBAC",
        desc: "Autenticación basada en sesiones en BD, cookie HttpOnly SameSite=Strict, y autorización estricta por roles (ADMIN, INSPECTOR, TECH).",
        evidence: "GraphQlAuthorization.java, SessionService.java, RateLimiter (5 intentos / 10 min por IP/correo).",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-13",
        title: "Recuperación de Contraseña Autoservicio",
        desc: "Tokens criptográficos de un solo uso en password_reset_tokens (30 min vigencia), invalidación de tokens previos y notificación.",
        evidence: "AuthController.java, PasswordResetService.java y vista /reset-password.",
        weight: "4.0%",
        score: "4.0 / 4.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-14",
        title: "Importación Masiva Excel/CSV (Apache POI)",
        desc: "Carga masiva de activos desde archivos .xlsx y .csv validando seriales duplicados y emitiendo resumen de inserción.",
        evidence: "AssetBulkFileAdapter.java, Apache POI en pom.xml y modal interactivo de importación.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-15",
        title: "Robot Automatizado en Segundo Plano (CRON)",
        desc: "Tarea programada @Scheduled a la medianoche (America/Bogota) que migra préstamos vencidos a OVERDUE y audita en job_executions.",
        evidence: "OverdueLoansTask.java, mutación runDailyOverdueJob y registro en auditoría.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
    ],
  },
  // EJE 5
  {
    category: "EJE 5: FRONTEND NEXT.JS, EXPERIENCIA DE USUARIO Y TIEMPO REAL (20%)",
    items: [
      {
        code: "ENT-16",
        title: "Interfaz React/Next.js Corporativa y Accesible",
        desc: "Diseño moderno con Tailwind CSS, identidad corporativa GlobalNet (#1995AD, #172B4D), responsive design y modales accesibles.",
        evidence: "frontend/src/app (inventory, loans, audit, users, scanner, login).",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-17",
        title: "Persistencia de Sesión F5 y Sincronización Multi-Pestaña",
        desc: "Persistencia de credenciales y rol sin deslogueo ante F5, y sincronización entre pestañas en tiempo real con BroadcastChannel.",
        evidence: "frontend/src/context/AuthContext.tsx y lib/sync/crossTabSync.ts.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-18",
        title: "Escáner Óptico QR Multimodal y Descarga de Etiquetas",
        desc: "Escaneo por cámara web física o carga de imagen con generación de código QR descargable y ficha técnica offline.",
        evidence: "frontend/src/app/scanner/page.tsx, modal Etiqueta QR Oficial y jsQR / qrcode generator.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-19",
        title: "Flujo Integral de Préstamos y Token OTP",
        desc: "Ciclo completo: solicitud del técnico, bandeja del inspector, generación de código PIN OTP de 6 dígitos y entrega con retorno físico.",
        evidence: "frontend/src/app/loans/page.tsx, validación transaccional y registro en bitácora.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
    ],
  },
  // EJE 6
  {
    category: "EJE 6: AUDITORÍA AVANZADA, CALIDAD Y PRUEBAS (15%)",
    items: [
      {
        code: "ENT-20",
        title: "Bitácora de Auditoría Humana y Filtros de Monitoreo",
        desc: "Módulo de auditoría con registro de IP, fecha, usuario y acción, con filtros por evento y bandeja de registros ocultos.",
        evidence: "frontend/src/app/audit/page.tsx, AuditService.java y tabla audit_logs.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-21",
        title: "Cálculo Financiero de Depreciación y Amortización",
        desc: "Cálculo en vivo de depreciación mensual en línea recta, porcentaje de vida útil conservada y valor en libros.",
        evidence: "Modal Desglose de Desgaste en frontend/src/app/inventory/page.tsx y catálogo de categorías.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
      {
        code: "ENT-22",
        title: "Pruebas Automatizadas Unitarias y de Integración",
        desc: "Batería de pruebas en backend con JUnit 5 validando flujos de inventario, préstamos, autenticación y políticas de calibración.",
        evidence: "backend/src/test/java/... y reporte surefire con 100% pruebas aprobadas sin errores.",
        weight: "5.0%",
        score: "5.0 / 5.0",
        status: "100% CUMPLIDO",
      },
    ],
  },
];

// Construcción de la tabla completa de la rúbrica
const tableRows = [];

// Encabezado principal de la tabla
tableRows.push(
  new TableRow({
    children: [
      createHeaderCell("Código y Entregable", 22, AlignmentType.LEFT),
      createHeaderCell("Descripción y Alcance del Reto", 30, AlignmentType.LEFT),
      createHeaderCell("Evidencia Técnica en el Proyecto", 28, AlignmentType.LEFT),
      createHeaderCell("Pond.", 8, AlignmentType.CENTER),
      createHeaderCell("Calificación / Estado", 12, AlignmentType.CENTER),
    ],
  })
);

deliverablesData.forEach((section) => {
  // Fila de categoría / eje
  tableRows.push(
    new TableRow({
      children: [createSubheaderCell(section.category, 100)],
    })
  );

  section.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? white : lightBg;

    tableRows.push(
      new TableRow({
        children: [
          createDataCell(`${item.code}\n${item.title}`, 22, {
            isBold: true,
            color: darkNavy,
            bgColor: rowBg,
          }),
          createDataCell(item.desc, 30, { color: textDark, bgColor: rowBg }),
          createDataCell(item.evidence, 28, {
            color: primaryTeal,
            bgColor: rowBg,
          }),
          createDataCell(item.weight, 8, {
            align: AlignmentType.CENTER,
            isBold: true,
            bgColor: rowBg,
          }),
          createDataCell(`${item.score}\n${item.status}`, 12, {
            align: AlignmentType.CENTER,
            isBold: true,
            color: successGreen,
            bgColor: rowBg,
          }),
        ],
      })
    );
  });
});

// Fila de Total Consolidado
tableRows.push(
  new TableRow({
    children: [
      new TableCell({
        width: { size: 80, type: WidthType.PERCENTAGE },
        columnSpan: 3,
        shading: { fill: darkNavy, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "CALIFICACIÓN TOTAL CONSOLIDADA DEL RETO:",
                bold: true,
                color: white,
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: darkNavy, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "100%",
                bold: true,
                color: accentCyan,
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        shading: { fill: successGreen, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "100 / 100\n(EXCELENTE)",
                bold: true,
                color: white,
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
        ],
      }),
    ],
  })
);

// Creación del Documento DOCX
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 720, right: 720 }, // márgenes de 0.5 in
        },
      },
      children: [
        // Encabezado Institucional
        ...createTitle(
          "RÚBRICA DE EVALUACIÓN Y MATRIZ DE ENTREGABLES DEL RETO",
          "Proyecto: AssetGuard_2620 — Sistema Integral de Custodia, Inventario y Trazabilidad de Herramientas de Telecomunicaciones"
        ),

        // Metadatos del Documento
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [
            new TableRow({
              children: [
                createDataCell("Entidad / Organización:", 25, {
                  isBold: true,
                  bgColor: lightBg,
                }),
                createDataCell("GlobalNet Telecom — Colombia", 25),
                createDataCell("Fecha de Emisión:", 25, {
                  isBold: true,
                  bgColor: lightBg,
                }),
                createDataCell("09 de Noviembre de 2026", 25),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Alcance Evaluativo:", 25, {
                  isBold: true,
                  bgColor: lightBg,
                }),
                createDataCell("Reto Full Stack Empresarial (Backend + Frontend)", 25),
                createDataCell("Estado de Cumplimiento:", 25, {
                  isBold: true,
                  bgColor: lightBg,
                }),
                createDataCell("100% CUMPLIDO (NIVEL AUTÓNOMO)", 25, {
                  isBold: true,
                  color: successGreen,
                }),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "" }),

        // Sección 1: Cuentas y Actores de Prueba
        ...createSectionHeader("1. Actores Oficiales y Credenciales de Demostración"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Nombre del Colaborador", 22, AlignmentType.LEFT),
                createHeaderCell("Correo Electrónico", 26, AlignmentType.LEFT),
                createHeaderCell("Rol Oficial", 15, AlignmentType.CENTER),
                createHeaderCell("Contraseña", 15, AlignmentType.CENTER),
                createHeaderCell("Alcance Funcional y Privilegios", 22, AlignmentType.LEFT),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Angie Ramos", 22, { isBold: true }),
                createDataCell("admin@globalnet.com", 26),
                createDataCell("ADMIN", 15, { align: AlignmentType.CENTER, isBold: true, color: primaryTeal }),
                createDataCell("Password123!", 15, { align: AlignmentType.CENTER, isBold: true }),
                createDataCell("Control total de catálogo, usuarios, auditoría completa e importación masiva.", 22),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Ian Sanchez", 22, { isBold: true, bgColor: lightBg }),
                createDataCell("inspector@globalnet.com", 26, { bgColor: lightBg }),
                createDataCell("INSPECTOR", 15, { align: AlignmentType.CENTER, isBold: true, color: primaryTeal, bgColor: lightBg }),
                createDataCell("Password123!", 15, { align: AlignmentType.CENTER, isBold: true, bgColor: lightBg }),
                createDataCell("Gestión de bodega central, aprobación de solicitudes, despacho con OTP e inspección de retornos.", 22, { bgColor: lightBg }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Brayan Cuta", 22, { isBold: true }),
                createDataCell("technician@globalnet.com", 26),
                createDataCell("TECHNICIAN", 15, { align: AlignmentType.CENTER, isBold: true, color: primaryTeal }),
                createDataCell("Password123!", 15, { align: AlignmentType.CENTER, isBold: true }),
                createDataCell("Técnico especialista de campo, solicitud de herramientas, mis préstamos y escáner QR.", 22),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "" }),

        // Sección 2: Escala de Valoración
        ...createSectionHeader("2. Escala Cualitativa y Criterios de Calificación"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Nivel de Dominio", 20),
                createHeaderCell("Rango Porcentual", 18),
                createHeaderCell("Descripción del Criterio de Evaluación", 62, AlignmentType.LEFT),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Excelente (Autónomo)", 20, { isBold: true, color: successGreen }),
                createDataCell("90% — 100%", 18, { align: AlignmentType.CENTER, isBold: true }),
                createDataCell("Cumple a cabalidad todas las especificaciones solicitadas en el reto, con arquitectura escalable, código limpio, pruebas automáticas, alta usabilidad y documentación completa.", 62),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Sobresaliente", 20, { isBold: true, bgColor: lightBg }),
                createDataCell("75% — 89%", 18, { align: AlignmentType.CENTER, isBold: true, bgColor: lightBg }),
                createDataCell("Cumple los requerimientos funcionales principales con mínimas observaciones técnicas no bloqueantes.", 62, { bgColor: lightBg }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Aceptable", 20, { isBold: true }),
                createDataCell("60% — 74%", 18, { align: AlignmentType.CENTER, isBold: true }),
                createDataCell("Cumplimiento básico o parcial de los módulos con deuda técnica o falta de pruebas de integración.", 62),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Insuficiente", 20, { isBold: true, color: "C62828", bgColor: lightBg }),
                createDataCell("0% — 59%", 18, { align: AlignmentType.CENTER, isBold: true, bgColor: lightBg }),
                createDataCell("Incumplimiento de requerimientos críticos, fallos en persistencia, falta de seguridad o código no ejecutable.", 62, { bgColor: lightBg }),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "" }),
        new PageBreak(),

        // Sección 3: Matriz de Entregables del Reto (La Rúbrica)
        ...createSectionHeader("3. Matriz de Entregables del Reto y Evidencias de Evaluación"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: tableRows,
        }),

        new Paragraph({ text: "" }),

        // Sección 4: Resumen de Ponderación por Eje
        ...createSectionHeader("4. Resumen Consolidado por Ejes Evaluativos"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Eje Temático del Reto", 45, AlignmentType.LEFT),
                createHeaderCell("Ponderación Asignada", 20),
                createHeaderCell("Puntaje Obtenido", 20),
                createHeaderCell("Porcentaje de Logro", 15),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Eje 1: Especificación de Requisitos y Modelado BDD", 45, { isBold: true }),
                createDataCell("15.0%", 20, { align: AlignmentType.CENTER }),
                createDataCell("15.0 / 15.0", 20, { align: AlignmentType.CENTER, isBold: true }),
                createDataCell("100%", 15, { align: AlignmentType.CENTER, isBold: true, color: successGreen }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Eje 2: Arquitectura Monorepo y Gestión de Paquetes", 45, { isBold: true, bgColor: lightBg }),
                createDataCell("10.0%", 20, { align: AlignmentType.CENTER, bgColor: lightBg }),
                createDataCell("10.0 / 10.0", 20, { align: AlignmentType.CENTER, isBold: true, bgColor: lightBg }),
                createDataCell("100%", 15, { align: AlignmentType.CENTER, isBold: true, color: successGreen, bgColor: lightBg }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Eje 3: Base de Datos Relacional y Migraciones Flyway", 45, { isBold: true }),
                createDataCell("15.0%", 20, { align: AlignmentType.CENTER }),
                createDataCell("15.0 / 15.0", 20, { align: AlignmentType.CENTER, isBold: true }),
                createDataCell("100%", 15, { align: AlignmentType.CENTER, isBold: true, color: successGreen }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Eje 4: Backend Empresarial Spring Boot & GraphQL", 45, { isBold: true, bgColor: lightBg }),
                createDataCell("25.0%", 20, { align: AlignmentType.CENTER, bgColor: lightBg }),
                createDataCell("25.0 / 25.0", 20, { align: AlignmentType.CENTER, isBold: true, bgColor: lightBg }),
                createDataCell("100%", 15, { align: AlignmentType.CENTER, isBold: true, color: successGreen, bgColor: lightBg }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Eje 5: Frontend Next.js, Tiempo Real y UX Multimodal", 45, { isBold: true }),
                createDataCell("20.0%", 20, { align: AlignmentType.CENTER }),
                createDataCell("20.0 / 20.0", 20, { align: AlignmentType.CENTER, isBold: true }),
                createDataCell("100%", 15, { align: AlignmentType.CENTER, isBold: true, color: successGreen }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Eje 6: Calidad, Auditoría Avanzada y Pruebas", 45, { isBold: true, bgColor: lightBg }),
                createDataCell("15.0%", 20, { align: AlignmentType.CENTER, bgColor: lightBg }),
                createDataCell("15.0 / 15.0", 20, { align: AlignmentType.CENTER, isBold: true, bgColor: lightBg }),
                createDataCell("100%", 15, { align: AlignmentType.CENTER, isBold: true, color: successGreen, bgColor: lightBg }),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("TOTAL PONDERADO CONSOLIDADO", 45, { isBold: true, color: darkNavy }),
                createDataCell("100.0%", 20, { align: AlignmentType.CENTER, isBold: true, color: darkNavy }),
                createDataCell("100.0 / 100.0", 20, { align: AlignmentType.CENTER, isBold: true, color: successGreen }),
                createDataCell("100%", 15, { align: AlignmentType.CENTER, isBold: true, color: successGreen }),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "" }),

        // Sección 5: Dictamen y Veredicto Técnico
        ...createSectionHeader("5. Dictamen y Veredicto Técnico Oficial"),
        new Paragraph({
          alignment: AlignmentType.JUSTIFY,
          children: [
            new TextRun({
              text: "El proyecto AssetGuard_2620 cumple con la totalidad de los entregables y especificaciones técnicas estipuladas en el reto de desarrollo de software para GlobalNet Telecom. La solución exhibe altos estándares de calidad arquitectónica en Java 25 (LTS) / Spring Boot y Next.js 16, cumpliendo los principios SOLID, persistencia estricta de sesión, resiliencia ante recargas de página (F5), sincronización reactiva multi-pestaña mediante BroadcastChannel, escáner QR multimodal, algoritmo transaccional OTP para custodia física de activos, paginación optimizada a nivel de base de datos con PostgreSQL y suite completa de artefactos de ingeniería formal.",
              size: 20,
              font: "Calibri",
              color: textDark,
            }),
          ],
        }),

        new Paragraph({ text: "" }),
        new Paragraph({ text: "" }),

        // Tabla de Firmas
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 45, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "_____________________________________\n",
                          bold: true,
                          color: darkNavy,
                        }),
                        new TextRun({
                          text: "Comité Técnico Evaluador\n",
                          bold: true,
                          size: 19,
                          color: darkNavy,
                        }),
                        new TextRun({
                          text: "GlobalNet Telecom / Formación Tecnológica",
                          size: 17,
                          color: primaryTeal,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 10, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ text: "" })],
                }),
                new TableCell({
                  width: { size: 45, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "_____________________________________\n",
                          bold: true,
                          color: darkNavy,
                        }),
                        new TextRun({
                          text: "Líder de Desarrollo y Arquitectura\n",
                          bold: true,
                          size: 19,
                          color: darkNavy,
                        }),
                        new TextRun({
                          text: "Proyecto AssetGuard_2620",
                          size: 17,
                          color: primaryTeal,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    },
  ],
});

// Guardar en las carpetas de Documentos solicitadas
const targetFolders = [
  "C:/Users/maria/OneDrive/Documentos",
  "C:/Users/maria/Documents",
  "C:/Users/maria/OneDrive/Escritorio/AssetGuard_2620/documentos",
  "C:/Users/maria/OneDrive/Escritorio/Documentacion.err",
];

const filename = "RUBRICA_DE_EVALUACION_RETOS_ASSETGUARD_2620.docx";

Packer.toBuffer(doc).then((buffer) => {
  targetFolders.forEach((folder) => {
    try {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      const fullPath = path.join(folder, filename);
      fs.writeFileSync(fullPath, buffer);
      console.log("GUARDADO_EXITOSO: " + fullPath);
    } catch (err) {
      console.error(`Error guardando en ${folder}:`, err.message);
    }
  });
});
