package com.globalnet.assetguard.infrastructure.persistence;

import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CalibrationRepository {

    private final JdbcTemplate jdbcTemplate;

    public CalibrationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long insert(
            long assetId,
            LocalDate calibrationDate,
            LocalDate dueDate,
            String result,
            String technicianName,
            String notes) {
        Long id = jdbcTemplate.queryForObject(
                """
                INSERT INTO calibration_records (asset_id, calibration_date, due_date, result,
                                                 technician_name, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING id
                """,
                Long.class,
                assetId,
                calibrationDate,
                dueDate,
                result,
                technicianName,
                notes);
        return id == null ? -1 : id;
    }
}
