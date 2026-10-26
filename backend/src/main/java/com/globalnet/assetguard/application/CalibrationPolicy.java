package com.globalnet.assetguard.application;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Semáforo de calibración (RF-008 / HU-012): combina la fecha de vencimiento
 * (última calibración + intervalo) con los ciclos de uso restantes.
 */
public final class CalibrationPolicy {

    public static final int YELLOW_DAYS = 15;
    public static final int YELLOW_CYCLES = 10;

    private CalibrationPolicy() {
    }

    public static GraphQlModels.CalibrationStatus evaluate(
            LocalDate lastCalibrationDate,
            int calibrationIntervalDays,
            int usageCycles,
            int maxUsageCycles,
            LocalDate today) {
        LocalDate dueDate = lastCalibrationDate.plusDays(calibrationIntervalDays);
        int daysUntilNextDue = (int) ChronoUnit.DAYS.between(today, dueDate);
        int cyclesRemaining = maxUsageCycles - usageCycles;
        boolean compliant = daysUntilNextDue >= 0 && cyclesRemaining > 0;

        String color;
        String message;
        if (!compliant) {
            color = "RED";
            message = daysUntilNextDue < 0
                    ? "Calibración vencida hace " + (-daysUntilNextDue) + " días."
                    : "Límite de ciclos de uso alcanzado.";
        } else if (daysUntilNextDue <= YELLOW_DAYS || cyclesRemaining <= YELLOW_CYCLES) {
            color = "YELLOW";
            message = daysUntilNextDue <= YELLOW_DAYS
                    ? "La calibración vence en " + daysUntilNextDue + " días."
                    : "Quedan " + cyclesRemaining + " ciclos de uso.";
        } else {
            color = "GREEN";
            message = null;
        }
        return new GraphQlModels.CalibrationStatus(compliant, daysUntilNextDue, cyclesRemaining, color, message);
    }
}
