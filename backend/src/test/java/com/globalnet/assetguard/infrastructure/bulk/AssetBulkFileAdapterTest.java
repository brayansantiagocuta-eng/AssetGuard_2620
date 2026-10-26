package com.globalnet.assetguard.infrastructure.bulk;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.globalnet.assetguard.infrastructure.graphql.ApiException;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlInputs;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class AssetBulkFileAdapterTest {

    private final AssetBulkFileAdapter adapter = new AssetBulkFileAdapter();

    @Test
    void parsesValidCsvWithHeader() {
        String csv = """
                serial_number,model,estimated_value,acquisition_date,category,location
                FUS-90S-101,Fujikura 90S+,8500.00,2026-01-15,Fusion Splicer (Fusionadora),Bodega Central Bogota - Calle 26
                """;
        String base64 = Base64.getEncoder().encodeToString(csv.getBytes(StandardCharsets.UTF_8));
        List<GraphQlInputs.BulkAssetRowInput> rows = adapter.parseBase64File("activos.csv", base64);

        assertEquals(1, rows.size());
        assertEquals("FUS-90S-101", rows.get(0).serialNumber());
        assertEquals("Fujikura 90S+", rows.get(0).model());
        assertEquals(8500.00, rows.get(0).estimatedValue());
        assertEquals("2026-01-15", rows.get(0).acquisitionDate());
    }

    @Test
    void parsesValidExcelXlsx() throws Exception {
        byte[] xlsxBytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Activos");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("serial_number");
            header.createCell(1).setCellValue("model");

            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("OTDR-730C-202");
            row.createCell(1).setCellValue("EXFO MaxTester 730C");
            row.createCell(2).setCellValue(12000.50);
            row.createCell(3).setCellValue("2026-02-10");
            row.createCell(4).setCellValue("Spectrum Analyzer (Analizador de Espectro)");
            row.createCell(5).setCellValue("Sucursal Operativa Medellin - Poblado");

            workbook.write(out);
            xlsxBytes = out.toByteArray();
        }

        String base64 = Base64.getEncoder().encodeToString(xlsxBytes);
        List<GraphQlInputs.BulkAssetRowInput> rows = adapter.parseBase64File("lote.xlsx", base64);

        assertEquals(1, rows.size());
        assertEquals("OTDR-730C-202", rows.get(0).serialNumber());
        assertEquals(12000.50, rows.get(0).estimatedValue());
    }

    @Test
    void rejectsUnsupportedExtension() {
        String base64 = Base64.getEncoder().encodeToString("test".getBytes(StandardCharsets.UTF_8));
        assertThrows(ApiException.class, () -> adapter.parseBase64File("malicioso.exe", base64));
    }
}
