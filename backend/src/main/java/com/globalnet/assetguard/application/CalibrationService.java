package com.globalnet.assetguard.application;

import com.globalnet.assetguard.infrastructure.graphql.ApiException;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import com.globalnet.assetguard.infrastructure.persistence.AssetRepository;
import com.globalnet.assetguard.infrastructure.persistence.CalibrationRepository;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registro de calibraciones y bloqueo preventivo (RF-008 / HU-012). */
@Service
public class CalibrationService {

    private final AssetRepository assetRepository;
    private final CalibrationRepository calibrationRepository;
    private final AuditService auditService;

    public CalibrationService(
            AssetRepository assetRepository,
            CalibrationRepository calibrationRepository,
            AuditService auditService) {
        this.assetRepository = assetRepository;
        this.calibrationRepository = calibrationRepository;
        this.auditService = auditService;
    }

    @Transactional
    public GraphQlModels.Asset register(long assetId, String result, String notes, String technicianName) {
        GraphQlModels.Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> ApiException.notFound("No se encontró el activo."));
        String normalized = result == null ? "" : result.trim().toUpperCase(Locale.ROOT);
        if (!"PASS".equals(normalized) && !"FAIL".equals(normalized)) {
            throw ApiException.badRequest("El resultado de la calibración debe ser PASS o FAIL.");
        }

        LocalDate today = LocalDate.now();
        LocalDate dueDate = today.plusDays(asset.calibrationIntervalDays());
        long recordId = calibrationRepository.insert(
                assetId, today, dueDate, normalized, technicianName, notes);
        assetRepository.updateCalibrationDate(assetId, today);

        if ("FAIL".equals(normalized)) {
            assetRepository.updateStatus(assetId, "MAINTENANCE");
        } else if ("MAINTENANCE".equals(asset.status())) {
            assetRepository.updateStatus(assetId, "AVAILABLE");
        }

        auditService.record(
                "REGISTER_CALIBRATION",
                "calibration_records",
                recordId,
                "{\"lastCalibrationDate\":\"" + asset.lastCalibrationDate() + "\"}",
                "{\"result\":\"" + normalized + "\",\"dueDate\":\"" + dueDate + "\"}");

        return assetRepository.findById(assetId)
                .orElseThrow(() -> ApiException.internal("No se pudo recargar el activo calibrado."));
    }
}
