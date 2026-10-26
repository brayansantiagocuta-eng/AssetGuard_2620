package com.globalnet.assetguard.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CalibrationPolicyTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 15);

    @Test
    void marksGreenWhenThereIsEnoughTimeAndCycles() {
        GraphQlModels.CalibrationStatus status = CalibrationPolicy.evaluate(
                TODAY, 180, 100, 500, TODAY);

        assertTrue(status.isCompliant());
        assertEquals(180, status.daysUntilNextDue());
        assertEquals(400, status.cyclesRemaining());
        assertEquals("GREEN", status.statusColor());
        assertNull(status.warningMessage());
    }

    @Test
    void marksYellowWhenCalibrationExpiresSoon() {
        GraphQlModels.CalibrationStatus status = CalibrationPolicy.evaluate(
                TODAY.minusDays(170), 180, 100, 500, TODAY);

        assertTrue(status.isCompliant());
        assertEquals("YELLOW", status.statusColor());
        assertEquals(10, status.daysUntilNextDue());
    }

    @Test
    void marksRedWhenCalibrationIsExpired() {
        GraphQlModels.CalibrationStatus status = CalibrationPolicy.evaluate(
                TODAY.minusDays(200), 180, 100, 500, TODAY);

        assertFalse(status.isCompliant());
        assertEquals("RED", status.statusColor());
        assertEquals(-20, status.daysUntilNextDue());
    }

    @Test
    void marksYellowWhenFewCyclesRemain() {
        GraphQlModels.CalibrationStatus status = CalibrationPolicy.evaluate(
                TODAY, 180, 495, 500, TODAY);

        assertTrue(status.isCompliant());
        assertEquals(5, status.cyclesRemaining());
        assertEquals("YELLOW", status.statusColor());
    }

    @Test
    void marksRedWhenCyclesAreExhausted() {
        GraphQlModels.CalibrationStatus status = CalibrationPolicy.evaluate(
                TODAY, 180, 500, 500, TODAY);

        assertFalse(status.isCompliant());
        assertEquals("RED", status.statusColor());
        assertEquals(0, status.cyclesRemaining());
    }
}