package com.globalnet.assetguard.infrastructure.graphql;

import com.globalnet.assetguard.domain.RoleType;
import com.globalnet.assetguard.domain.UserStatus;

/** Objetos de entrada del contrato GraphQL. */
public final class GraphQlInputs {

    private GraphQlInputs() {
    }

    public record PaginationInput(Integer page, Integer size) {
    }

    public record CreateUserInput(String fullName, String email, String password, RoleType role) {
    }

    public record UpdateUserInput(String fullName, RoleType role, UserStatus status) {
    }

    public record CreateAssetInput(
            String serialNumber,
            String qrCode,
            String model,
            Double estimatedValue,
            String acquisitionDate,
            Long categoryId,
            Long locationId,
            Integer maxUsageCycles,
            Integer calibrationIntervalDays) {
    }

    public record CreateLoanRequestInput(
            Long assetId,
            String requiredDate,
            String expectedReturnDate,
            String motive) {
    }

    public record BulkAssetRowInput(
            String serialNumber,
            String model,
            Double estimatedValue,
            String acquisitionDate,
            String categoryName,
            String locationName) {
    }
}
