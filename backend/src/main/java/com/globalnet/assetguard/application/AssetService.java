package com.globalnet.assetguard.application;

import com.globalnet.assetguard.domain.AssetStatus;
import com.globalnet.assetguard.infrastructure.graphql.ApiException;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlInputs;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import com.globalnet.assetguard.infrastructure.persistence.AssetRepository;
import com.globalnet.assetguard.infrastructure.persistence.CatalogRepository;
import com.globalnet.assetguard.infrastructure.persistence.LoanRepository;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Inventario de activos (RF-004 a RF-006). */
@Service
public class AssetService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AssetService.class);

    private final AssetRepository assetRepository;
    private final CatalogRepository catalogRepository;
    private final LoanRepository loanRepository;
    private final AuditService auditService;
    private final TransactionTemplate transactionTemplate;

    public AssetService(
            AssetRepository assetRepository,
            CatalogRepository catalogRepository,
            LoanRepository loanRepository,
            AuditService auditService,
            PlatformTransactionManager transactionManager) {
        this.assetRepository = assetRepository;
        this.catalogRepository = catalogRepository;
        this.loanRepository = loanRepository;
        this.auditService = auditService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public GraphQlModels.Asset findById(long id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("No se encontró el activo."));
    }

    public GraphQlModels.Asset findBySerialNumber(String serialNumber) {
        if (serialNumber == null || serialNumber.isBlank()) {
            throw ApiException.badRequest("El número de serie es obligatorio.");
        }
        return assetRepository.findBySerialNumber(serialNumber.trim())
                .orElseThrow(() -> ApiException.notFound("No se encontró un activo con ese número de serie."));
    }

    public GraphQlModels.Page<GraphQlModels.Asset> findPage(
            AssetStatus status,
            Long categoryId,
            String search,
            PageQuery query) {
        return assetRepository.findPage(
                status == null ? null : status.name(), categoryId, search, query);
    }

    public GraphQlModels.CalibrationStatus calibrationStatus(long assetId) {
        return findById(assetId).calibrationStatus();
    }

    public List<GraphQlModels.Category> categories() {
        return catalogRepository.findCategories();
    }

    public List<GraphQlModels.Location> locations() {
        return catalogRepository.findLocations();
    }

    @Transactional
    public GraphQlModels.Asset create(GraphQlInputs.CreateAssetInput input) {
        if (input == null) {
            throw ApiException.badRequest("Los datos del activo son obligatorios.");
        }
        String serialNumber = required(input.serialNumber(), "El número de serie es obligatorio.");
        String model = required(input.model(), "El modelo es obligatorio.");
        if (input.estimatedValue() == null || input.estimatedValue() < 0) {
            throw ApiException.badRequest("El valor estimado debe ser mayor o igual a cero.");
        }
        LocalDate acquisitionDate = parseDate(input.acquisitionDate(), "la fecha de adquisición");
        if (input.categoryId() == null) {
            throw ApiException.badRequest("La categoría es obligatoria.");
        }
        if (input.locationId() == null) {
            throw ApiException.badRequest("La ubicación es obligatoria.");
        }
        if (catalogRepository.findCategory(input.categoryId()).isEmpty()) {
            throw ApiException.badRequest("La categoría indicada no existe.");
        }
        if (catalogRepository.findLocation(input.locationId()).isEmpty()) {
            throw ApiException.badRequest("La ubicación indicada no existe.");
        }
        int maxUsageCycles = input.maxUsageCycles() == null ? 500 : input.maxUsageCycles();
        int calibrationIntervalDays = input.calibrationIntervalDays() == null
                ? 180
                : input.calibrationIntervalDays();
        if (maxUsageCycles <= 0) {
            throw ApiException.badRequest("El máximo de ciclos de uso debe ser mayor que cero.");
        }
        if (calibrationIntervalDays <= 0) {
            throw ApiException.badRequest("El intervalo de calibración debe ser mayor que cero.");
        }
        if (assetRepository.existsSerialNumber(serialNumber)) {
            throw ApiException.conflict("Ya existe un activo con el número de serie " + serialNumber + ".");
        }
        String qrCode = input.qrCode() == null || input.qrCode().isBlank() ? null : input.qrCode().trim();
        if (qrCode != null && assetRepository.existsQrCode(qrCode)) {
            throw ApiException.conflict("Ya existe un activo con el código QR " + qrCode + ".");
        }

        long id = assetRepository.insert(
                serialNumber,
                qrCode,
                model,
                BigDecimal.valueOf(input.estimatedValue()),
                acquisitionDate,
                input.categoryId(),
                input.locationId(),
                maxUsageCycles,
                calibrationIntervalDays);
        auditService.record(
                "CREATE_ASSET",
                "assets",
                id,
                null,
                "{\"serialNumber\":\"" + serialNumber + "\",\"model\":\"" + model + "\"}");
        return findById(id);
    }

    @Transactional
    public GraphQlModels.Asset updateStatus(long id, AssetStatus status, String notes) {
        GraphQlModels.Asset asset = findById(id);
        if (status == null) {
            throw ApiException.badRequest("El estado es obligatorio.");
        }
        if (asset.status().equals(status.name())) {
            return asset;
        }
        boolean hasActiveLoan = loanRepository.hasActiveLoan(id);
        if (asset.status().equals(AssetStatus.ON_LOAN.name()) && status != AssetStatus.ON_LOAN) {
            throw ApiException.conflict(
                    "El activo está prestado. Registre la devolución antes de cambiar su estado.");
        }
        if (status == AssetStatus.ON_LOAN && !hasActiveLoan) {
            throw ApiException.conflict("No existe un préstamo activo que justifique el estado ON_LOAN.");
        }
        if (hasActiveLoan && (status == AssetStatus.AVAILABLE || status == AssetStatus.RETIRED)) {
            throw ApiException.conflict("El activo tiene un préstamo activo o vencido.");
        }

        assetRepository.updateStatus(id, status.name());
        auditService.record(
                "UPDATE_ASSET_STATUS",
                "assets",
                id,
                "{\"status\":\"" + asset.status() + "\"}",
                "{\"status\":\"" + status.name() + "\",\"notes\":\"" + nullSafe(notes) + "\"}");
        return findById(id);
    }

    @Transactional
    public GraphQlModels.BulkUploadResult bulkUpload(List<GraphQlInputs.BulkAssetRowInput> rows) {
        if (rows == null || rows.isEmpty()) {
            throw ApiException.badRequest("Debe enviar al menos una fila para la carga masiva.");
        }

        // Fase 1: validacion completa antes de insertar (reversion total, HU-019).
        Set<String> serialsInPayload = new HashSet<>();
        List<PreparedRow> prepared = new java.util.ArrayList<>(rows.size());
        for (int index = 0; index < rows.size(); index++) {
            GraphQlInputs.BulkAssetRowInput row = rows.get(index);
            int rowNumber = index + 1;
            if (row == null) {
                return failure(rows.size(), rowNumber, "La fila está vacía.");
            }
            if (isBlank(row.serialNumber())) {
                return failure(rows.size(), rowNumber, "El número de serie es obligatorio.");
            }
            if (isBlank(row.model())) {
                return failure(rows.size(), rowNumber, "El modelo es obligatorio.");
            }
            if (row.estimatedValue() == null || row.estimatedValue() < 0) {
                return failure(rows.size(), rowNumber, "El valor estimado debe ser mayor o igual a cero.");
            }
            LocalDate acquisitionDate;
            try {
                acquisitionDate = parseDate(row.acquisitionDate(), "la fecha de adquisición");
            } catch (ApiException exception) {
                return failure(rows.size(), rowNumber, exception.getMessage());
            }
            Long categoryId = catalogRepository.findCategoryIdByName(required(row.categoryName(), "La categoría es obligatoria."))
                    .orElse(null);
            if (categoryId == null) {
                return failure(rows.size(), rowNumber, "La categoría '" + row.categoryName() + "' no existe.");
            }
            Long locationId = catalogRepository.findLocationIdByName(required(row.locationName(), "La ubicación es obligatoria."))
                    .orElse(null);
            if (locationId == null) {
                return failure(rows.size(), rowNumber, "La ubicación '" + row.locationName() + "' no existe.");
            }
            String serial = row.serialNumber().trim().toUpperCase(Locale.ROOT);
            if (!serialsInPayload.add(serial)) {
                return failure(rows.size(), rowNumber, "El número de serie " + row.serialNumber() + " está repetido en el archivo.");
            }
            if (assetRepository.existsSerialNumber(serial)) {
                return failure(rows.size(), rowNumber, "El número de serie " + row.serialNumber() + " ya existe en el inventario.");
            }
            prepared.add(new PreparedRow(
                    row.serialNumber().trim(), row.model().trim(),
                    BigDecimal.valueOf(row.estimatedValue()), acquisitionDate, categoryId, locationId));
        }

        // Fase 2: insercion atomica.
        try {
            transactionTemplate.executeWithoutResult(status -> {
                for (PreparedRow row : prepared) {
                    assetRepository.insert(
                            row.serialNumber(), null, row.model(), row.estimatedValue(),
                            row.acquisitionDate(), row.categoryId(), row.locationId(), 500, 180);
                }
            });
        } catch (RuntimeException exception) {
            LOGGER.error("Fallo la carga masiva de activos", exception);
            return failure(rows.size(), 0, "No se insertó ningún activo: " + exception.getMessage());
        }

        auditService.record(
                "BULK_UPLOAD_ASSETS",
                "assets",
                null,
                null,
                "{\"inserted\":" + prepared.size() + "}");
        return new GraphQlModels.BulkUploadResult(true, rows.size(), prepared.size(), null, null);
    }

    private static GraphQlModels.BulkUploadResult failure(int total, int rowNumber, String message) {
        return new GraphQlModels.BulkUploadResult(
                false, total, 0, "Fila " + rowNumber + ": " + message, rowNumber == 0 ? null : rowNumber);
    }

    private static LocalDate parseDate(String value, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("Debe indicar " + field + " en formato AAAA-MM-DD.");
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw ApiException.badRequest("La fecha " + field + " debe tener el formato AAAA-MM-DD.");
        }
    }

    private static String required(String value, String message) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(message);
        }
        return value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.replace("\"", "'");
    }

    private record PreparedRow(
            String serialNumber,
            String model,
            BigDecimal estimatedValue,
            LocalDate acquisitionDate,
            long categoryId,
            long locationId) {
    }
}
