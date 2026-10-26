package com.globalnet.assetguard.infrastructure.graphql;

import java.util.List;

/**
 * Tipos de salida del contrato GraphQL (schema.graphqls).
 * Los nombres de los componentes coinciden con los campos del esquema para que
 * Spring GraphQL los resuelva directamente, sin capa de mapeo adicional.
 */
public final class GraphQlModels {

    private GraphQlModels() {
    }

    public record PageInfo(
            int currentPage,
            int pageSize,
            int totalElements,
            int totalPages,
            boolean hasNextPage,
            boolean hasPreviousPage) {
    }

    public record Page<T>(List<T> items, PageInfo pageInfo) {
    }

    public record User(
            long id,
            String role,
            String fullName,
            String email,
            String status,
            String createdAt,
            String updatedAt) {
    }

    public record Category(long id, String name, int usefulLifeMonths) {
    }

    public record Location(long id, String name, String type) {
    }

    public record CalibrationStatus(
            boolean isCompliant,
            int daysUntilNextDue,
            int cyclesRemaining,
            String statusColor,
            String warningMessage) {

        // graphql-java resuelve el campo "isCompliant" por convención get/is.
        public Boolean getIsCompliant() {
            return isCompliant;
        }
    }

    public record Asset(
            long id,
            String serialNumber,
            String qrCode,
            String model,
            double estimatedValue,
            String acquisitionDate,
            String status,
            int usageCycles,
            int maxUsageCycles,
            String lastCalibrationDate,
            int calibrationIntervalDays,
            Category category,
            Location location,
            CalibrationStatus calibrationStatus,
            String createdAt,
            String updatedAt) {
    }

    public record OtpTokenInfo(
            long id,
            String expiresAt,
            int attemptsRemaining,
            boolean used,
            String pin) {
    }

    public record Loan(
            long id,
            long loanRequestId,
            Asset asset,
            String deliveryDate,
            String actualReturnDate,
            String status,
            String notes) {
    }

    public record LoanRequest(
            long id,
            User technician,
            Asset asset,
            String requestDate,
            String requiredDate,
            String expectedReturnDate,
            String motive,
            String status,
            OtpTokenInfo activeOtp,
            Loan loan,
            String createdAt) {
    }

    public record CalibrationRecord(
            long id,
            Asset asset,
            String calibrationDate,
            String dueDate,
            String result,
            String technicianName,
            String notes,
            String createdAt) {
    }

    public record FinancialSummary(
            int totalAssetsCount,
            double totalAcquisitionValue,
            double currentDepreciatedValue,
            int overdueAssetsCount,
            double totalValueAtRisk,
            String currency) {
    }

    public record AuditLog(
            long id,
            Long userId,
            String userFullName,
            String action,
            String entityName,
            Long entityId,
            String oldValue,
            String newValue,
            String ipAddress,
            String createdAt) {
    }

    public record BulkUploadResult(
            boolean success,
            int totalProcessed,
            int insertedCount,
            String errorMessage,
            Integer failedRowNumber) {
    }

    public record JobExecution(
            long id,
            String jobName,
            String executedAt,
            String status,
            int recordsProcessed,
            String details) {
    }
}
