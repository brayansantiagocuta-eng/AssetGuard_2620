package com.globalnet.assetguard.infrastructure.bulk;

import com.globalnet.assetguard.infrastructure.graphql.ApiException;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlInputs;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;

/**
 * Adaptador de Infraestructura para la lectura de archivos fisicos Excel (.xlsx) y CSV (.csv)
 * en la carga masiva de activos (RF-005 / HU-005 / BOD-CU-013).
 */
@Component
public class AssetBulkFileAdapter {

    private static final int MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
    private static final int MAX_ROWS = 5000;

    public List<GraphQlInputs.BulkAssetRowInput> parseBase64File(String fileName, String base64Content) {
        if (fileName == null || fileName.isBlank()) {
            throw ApiException.badRequest("El nombre del archivo es obligatorio.");
        }
        if (base64Content == null || base64Content.isBlank()) {
            throw ApiException.badRequest("El contenido del archivo está vacío.");
        }

        String normalizedPayload = base64Content.trim();
        int commaIndex = normalizedPayload.indexOf(',');
        if (normalizedPayload.startsWith("data:") && commaIndex > 0) {
            normalizedPayload = normalizedPayload.substring(commaIndex + 1);
        }

        byte[] fileBytes;
        try {
            fileBytes = Base64.getDecoder().decode(normalizedPayload);
        } catch (IllegalArgumentException exception) {
            throw ApiException.badRequest("El archivo enviado no tiene una codificación Base64 válida.");
        }

        if (fileBytes.length == 0) {
            throw ApiException.badRequest("El archivo está vacío.");
        }
        if (fileBytes.length > MAX_FILE_BYTES) {
            throw ApiException.badRequest("El archivo supera el tamaño máximo permitido de 5 MB.");
        }

        String lowerName = fileName.trim().toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
            return parseExcel(fileBytes);
        }
        if (lowerName.endsWith(".csv")) {
            return parseCsv(fileBytes);
        }
        throw ApiException.badRequest("Formato no permitido. Solo se aceptan archivos .xlsx o .csv.");
    }

    private List<GraphQlInputs.BulkAssetRowInput> parseExcel(byte[] bytes) {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            if (workbook.getNumberOfSheets() == 0) {
                throw ApiException.badRequest("El archivo Excel no contiene hojas de cálculo.");
            }
            Sheet sheet = workbook.getSheetAt(0);
            List<GraphQlInputs.BulkAssetRowInput> rows = new ArrayList<>();
            boolean headerChecked = false;

            for (Row row : sheet) {
                if (isRowEmpty(row)) {
                    continue;
                }
                String col0 = readCellString(row.getCell(0));
                if (!headerChecked) {
                    headerChecked = true;
                    if (isHeaderColumn(col0)) {
                        continue;
                    }
                }
                if (rows.size() >= MAX_ROWS) {
                    throw ApiException.badRequest("El archivo supera el límite máximo de 5000 filas.");
                }
                String serialNumber = col0;
                String model = readCellString(row.getCell(1));
                Double estimatedValue = readCellDouble(row.getCell(2));
                String acquisitionDate = readCellDateOrString(row.getCell(3));
                String categoryName = readCellString(row.getCell(4));
                String locationName = readCellString(row.getCell(5));

                rows.add(new GraphQlInputs.BulkAssetRowInput(
                        serialNumber,
                        model,
                        estimatedValue,
                        acquisitionDate,
                        categoryName,
                        locationName));
            }
            return rows;
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw ApiException.badRequest("No se pudo leer el archivo Excel: " + exception.getMessage());
        }
    }

    private List<GraphQlInputs.BulkAssetRowInput> parseCsv(byte[] bytes) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8))) {
            List<GraphQlInputs.BulkAssetRowInput> rows = new ArrayList<>();
            String line;
            boolean headerChecked = false;

            while ((line = reader.readLine()) != null) {
                String trimmed = line.replace("\uFEFF", "").trim();
                if (trimmed.isEmpty()) {
                    continue;
                }
                char delimiter = trimmed.contains(";") && !trimmed.contains(",") ? ';' : ',';
                List<String> cols = splitCsvLine(trimmed, delimiter);
                if (cols.isEmpty()) {
                    continue;
                }
                if (!headerChecked) {
                    headerChecked = true;
                    if (isHeaderColumn(cols.get(0))) {
                        continue;
                    }
                }
                if (rows.size() >= MAX_ROWS) {
                    throw ApiException.badRequest("El archivo supera el límite máximo de 5000 filas.");
                }
                String serialNumber = getColumn(cols, 0);
                String model = getColumn(cols, 1);
                Double estimatedValue = parseDoubleSafe(getColumn(cols, 2));
                String acquisitionDate = getColumn(cols, 3);
                String categoryName = getColumn(cols, 4);
                String locationName = getColumn(cols, 5);

                rows.add(new GraphQlInputs.BulkAssetRowInput(
                        serialNumber,
                        model,
                        estimatedValue,
                        acquisitionDate,
                        categoryName,
                        locationName));
            }
            return rows;
        } catch (ApiException exception) {
            throw exception;
        } catch (IOException exception) {
            throw ApiException.badRequest("No se pudo leer el archivo CSV: " + exception.getMessage());
        }
    }

    private static boolean isHeaderColumn(String value) {
        if (value == null) {
            return false;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("serial_number")
                || normalized.equals("serialnumber")
                || normalized.equals("serie")
                || normalized.equals("numero de serie")
                || normalized.equals("número de serie");
    }

    private static boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        for (int i = 0; i < 6; i++) {
            String val = readCellString(row.getCell(i));
            if (val != null && !val.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static String readCellString(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double num = cell.getNumericCellValue();
                if (num == Math.rint(num)) {
                    yield String.valueOf((long) num);
                }
                yield String.valueOf(num);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }

    private static Double readCellDouble(Cell cell) {
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            return cell.getNumericCellValue();
        }
        if (cell.getCellType() == CellType.STRING) {
            return parseDoubleSafe(cell.getStringCellValue());
        }
        return null;
    }

    private static String readCellDateOrString(Cell cell) {
        if (cell == null) {
            return "";
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            LocalDate date = cell.getDateCellValue().toInstant()
                    .atZone(ZoneId.of("America/Bogota"))
                    .toLocalDate();
            return date.toString();
        }
        return readCellString(cell);
    }

    private static Double parseDoubleSafe(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value.replace("$", "").replace(",", "").trim());
        } catch (NumberFormatException exception) {
            return -1.0;
        }
    }

    private static String getColumn(List<String> cols, int index) {
        return index < cols.size() ? cols.get(index).trim() : "";
    }

    private static List<String> splitCsvLine(String line, char delimiter) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                inQuotes = !inQuotes;
            } else if (ch == delimiter && !inQuotes) {
                result.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        result.add(current.toString().trim());
        return result;
    }
}
