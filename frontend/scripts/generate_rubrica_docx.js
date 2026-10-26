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
} = require("C:/Users/maria/OneDrive/Escritorio/AssetGuard_2620/frontend/node_modules/docx");

const primaryColor = "1995AD";
const secondaryColor = "172B4D";
const accentColor = "A1D6E2";
const lightBg = "F1F1F2";

function createHeaderCell(text, widthPercent) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: primaryColor },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            color: "FFFFFF",
            size: 20,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function createDataCell(text, widthPercent, isBold = false, align = AlignmentType.LEFT) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: isBold,
            color: secondaryColor,
            size: 19,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "RÚBRICA DE EVALUACIÓN Y MATRIZ DE CUMPLIMIENTO",
              bold: true,
              size: 36,
              color: secondaryColor,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Proyecto: AssetGuard_2620 — GlobalNet Telecom",
              bold: true,
              size: 24,
              color: primaryColor,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({ text: "" }),

        new Paragraph({
          children: [
            new TextRun({
              text: "1. Actores Operativos Oficiales y Credenciales de Prueba",
              bold: true,
              size: 24,
              color: secondaryColor,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({ text: "" }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Nombre Oficial", 22),
                createHeaderCell("Correo", 26),
                createHeaderCell("Rol", 16),
                createHeaderCell("Cargo / Área", 36),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Angie Ramos", 22, true),
                createDataCell("admin@globalnet.com", 26),
                createDataCell("ADMIN", 16, true),
                createDataCell("Directora de Logística (Sin acción ¿Olvidaste tu contraseña?)", 36),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Ian Sanchez", 22, true),
                createDataCell("inspector@globalnet.com", 26),
                createDataCell("INSPECTOR", 16, true),
                createDataCell("Encargado de Bodega Central (Recuperación con alerta)", 36),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("Brayan Cuta", 22, true),
                createDataCell("technician@globalnet.com", 26),
                createDataCell("TECHNICIAN", 16, true),
                createDataCell("Técnico Especialista de Campo (Recuperación con alerta)", 36),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({
              text: "2. Matriz Consolidada de Evaluación (100% Cumplido)",
              bold: true,
              size: 24,
              color: secondaryColor,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({ text: "" }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Eje de Evaluación", 40),
                createHeaderCell("Ponderación", 18),
                createHeaderCell("Puntos Obtenidos", 22),
                createHeaderCell("Cumplimiento", 20),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("1. Arquitectura Mono-repo y Gestor pnpm", 40, true),
                createDataCell("15%", 18, false, AlignmentType.CENTER),
                createDataCell("15.0 / 15.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("2. Backend Spring Boot, GraphQL y Seguridad", 40, true),
                createDataCell("20%", 18, false, AlignmentType.CENTER),
                createDataCell("20.0 / 20.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("3. Base de Datos PostgreSQL, Flyway e Idempotencia", 40, true),
                createDataCell("15%", 18, false, AlignmentType.CENTER),
                createDataCell("15.0 / 15.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("4. Inventario, Catálogo 15 Equipos y Depreciación", 40, true),
                createDataCell("15%", 18, false, AlignmentType.CENTER),
                createDataCell("15.0 / 15.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("5. Préstamos, Custodia Física y Algoritmo OTP", 40, true),
                createDataCell("15%", 18, false, AlignmentType.CENTER),
                createDataCell("15.0 / 15.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("6. Escáner QR Multimodal y Fichas Persistentes", 40, true),
                createDataCell("5%", 18, false, AlignmentType.CENTER),
                createDataCell("5.0 / 5.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("7. Auditoría Humana y Monitoreo CRON de Vencimiento", 40, true),
                createDataCell("5%", 18, false, AlignmentType.CENTER),
                createDataCell("5.0 / 5.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("8. Frontend React/Next.js, UX y Persistencia F5", 40, true),
                createDataCell("5%", 18, false, AlignmentType.CENTER),
                createDataCell("5.0 / 5.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("9. Documentación Formal (Gherkin, RF/RNF, Diagramas)", 40, true),
                createDataCell("5%", 18, false, AlignmentType.CENTER),
                createDataCell("5.0 / 5.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (Excelente)", 20, false, AlignmentType.CENTER),
              ],
            }),
            new TableRow({
              children: [
                createDataCell("TOTAL GENERAL", 40, true),
                createDataCell("100%", 18, true, AlignmentType.CENTER),
                createDataCell("100.0 / 100.0", 22, true, AlignmentType.CENTER),
                createDataCell("100% (MÁXIMA)", 20, true, AlignmentType.CENTER),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({
              text: "3. Veredicto Técnico Oficial de Cumplimiento",
              bold: true,
              size: 24,
              color: secondaryColor,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({
              text: "El proyecto AssetGuard_2620 se encuentra al 100% de cumplimiento técnico conforme a todas las especificaciones solicitadas. Dispone de estricta asignación de personas a roles (Angie Ramos, Ian Sanchez y Brayan Cuta), persistencia segura ante F5 sin alternancia de usuarios, escáner QR multimodal con historial de fichas técnicas en almacenamiento local, y suite completa de artefactos de ingeniería (Gherkin HU-001 a HU-007, 16 RF, 12 RNF, diagramas UML, BPMN 2.0 y Modelo Relacional).",
              color: secondaryColor,
              size: 20,
              font: "Calibri",
            }),
          ],
        }),
      ],
    },
  ],
});

const outputPath = "C:/Users/maria/Downloads/RUBRICA_DE_EVALUACION_ASSETGUARD_2620.docx";
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log("DOCX_GENERATED_SUCCESSFULLY: " + outputPath);
});
