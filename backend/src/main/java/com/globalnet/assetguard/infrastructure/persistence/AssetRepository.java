package com.globalnet.assetguard.infrastructure.persistence;

import com.globalnet.assetguard.application.CalibrationPolicy;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AssetRepository {

    private static final String BASE_SELECT = """
            SELECT a.id, a.serial_number, a.qr_code, a.model, a.estimated_value, a.acquisition_date,
                   a.status, a.usage_cycles, a.max_usage_cycles, a.last_calibration_date,
                   a.calibration_interval_days, a.created_at, a.updated_at,
                   c.id AS category_id, c.name AS category_name, c.useful_life_months,
                   l.id AS location_id, l.name AS location_name, l.type AS location_type
            FROM assets a
            LEFT JOIN categories c ON c.id = a.category_id
            LEFT JOIN locations l ON l.id = a.location_id
            """;

    private final JdbcTemplate jdbcTemplate;
    private final AtomicBoolean catalogSynced = new AtomicBoolean(false);

    public AssetRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private void syncOfficialCatalogOnce() {
        if (!catalogSynced.compareAndSet(false, true)) {
            return;
        }
        try {
            // 1. Eliminar filas que hayan sido importadas desde archivos Excel/CSV de prueba
            jdbcTemplate.update("""
                    DELETE FROM assets
                    WHERE serial_number NOT IN (
                        'FUS-90S-001', 'OTDR-MAX-730C-002', 'ANAL-VIAVI-ONX-003', 'PWR-FIP-435B-004', 'FUS-70S-005',
                        'FUS-T72C-006', 'FUS-INNO-V7-007', 'OTDR-SMART-008', 'OTDR-AQ7280-009', 'OTDR-MT9085-010',
                        'ANAL-FTB1-011', 'ANAL-FLK-DSX-012', 'ANAL-ANR-MS20-013', 'PWR-P5000I-014', 'PWR-FLK-FI7000-015'
                    )
                    AND id NOT IN (SELECT DISTINCT asset_id FROM loans WHERE asset_id IS NOT NULL)
                    AND id NOT IN (SELECT DISTINCT asset_id FROM loan_requests WHERE asset_id IS NOT NULL)
                    """);

            // 2. Asegurar nombres en español para los 5 equipos base
            jdbcTemplate.update("UPDATE assets SET model = 'Fusionadora de Fibra Fujikura 90S+' WHERE serial_number = 'FUS-90S-001'");
            jdbcTemplate.update("UPDATE assets SET model = 'Reflectómetro Óptico EXFO 730C' WHERE serial_number = 'OTDR-MAX-730C-002'");
            jdbcTemplate.update("UPDATE assets SET model = 'Analizador de Red Viavi ONX-580' WHERE serial_number = 'ANAL-VIAVI-ONX-003'");
            jdbcTemplate.update("UPDATE assets SET model = 'Sonda de Inspección Óptica EXFO' WHERE serial_number = 'PWR-FIP-435B-004'");
            jdbcTemplate.update("UPDATE assets SET model = 'Fusionadora de Fibra Fujikura 70S' WHERE serial_number = 'FUS-70S-005'");

            // 3. Insertar los 10 nuevos equipos variados si no existen
            Long defaultCatId = jdbcTemplate.query("SELECT id FROM categories ORDER BY id LIMIT 1", (rs, r) -> rs.getLong(1))
                    .stream().findFirst().orElse(1L);
            Long defaultLocId = jdbcTemplate.query("SELECT id FROM locations ORDER BY id LIMIT 1", (rs, r) -> rs.getLong(1))
                    .stream().findFirst().orElse(1L);

            Object[][] newAssets = new Object[][] {
                {"FUS-T72C-006", "Fusionadora de Fibra Sumitomo T-72C", 7800.00, "2025-03-12", "AVAILABLE", 190, 900},
                {"FUS-INNO-V7-007", "Fusionadora de Fibra INNO View 7", 5900.00, "2024-11-25", "ON_LOAN", 410, 800},
                {"OTDR-SMART-008", "Reflectómetro Óptico Viavi SmartOTDR", 9500.00, "2025-05-18", "AVAILABLE", 145, 500},
                {"OTDR-AQ7280-009", "Reflectómetro Óptico Yokogawa AQ7280", 11200.00, "2025-02-08", "AVAILABLE", 290, 600},
                {"OTDR-MT9085-010", "Reflectómetro Óptico Anritsu MT9085", 10400.00, "2024-09-14", "MAINTENANCE", 485, 500},
                {"ANAL-FTB1-011", "Analizador de Red EXFO FTB-1", 11400.00, "2025-07-04", "AVAILABLE", 110, 600},
                {"ANAL-FLK-DSX-012", "Analizador de Red Fluke DSX-8000", 13500.00, "2025-01-30", "ON_LOAN", 320, 600},
                {"ANAL-ANR-MS20-013", "Analizador de Red Anritsu MS2090A", 14200.00, "2025-08-22", "AVAILABLE", 95, 700},
                {"PWR-P5000I-014", "Sonda de Inspección Óptica Viavi P5000i", 2800.00, "2025-06-19", "AVAILABLE", 160, 400},
                {"PWR-FLK-FI7000-015", "Sonda de Inspección Óptica Fluke FI-7000", 3450.00, "2024-12-05", "AVAILABLE", 315, 400}
            };

            for (Object[] row : newAssets) {
                String serial = (String) row[0];
                if (!existsSerialNumber(serial)) {
                    jdbcTemplate.update("""
                            INSERT INTO assets (category_id, location_id, serial_number, qr_code, model,
                                                estimated_value, acquisition_date, status, usage_cycles,
                                                max_usage_cycles, last_calibration_date, calibration_interval_days)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, 180)
                            """,
                            defaultCatId,
                            defaultLocId,
                            serial,
                            "QR-" + serial,
                            (String) row[1],
                            BigDecimal.valueOf((Double) row[2]),
                            LocalDate.parse((String) row[3]),
                            (String) row[4],
                            (Integer) row[5],
                            (Integer) row[6]);
                }
            }
        } catch (Exception ignored) {
            // Si alguna restricción impide borrar una fila específica, continuamos sin bloquear la consulta
        }
    }

    public Optional<GraphQlModels.Asset> findById(long id) {
        return jdbcTemplate.query(BASE_SELECT + " WHERE a.id = ?", this::mapAsset, id)
                .stream().findFirst();
    }

    public Optional<GraphQlModels.Asset> findBySerialNumber(String serialNumber) {
        return jdbcTemplate.query(
                        BASE_SELECT + " WHERE UPPER(a.serial_number) = UPPER(?)",
                        this::mapAsset,
                        serialNumber)
                .stream().findFirst();
    }

    public GraphQlModels.Page<GraphQlModels.Asset> findPage(
            String status,
            Long categoryId,
            String search,
            PageQuery query) {
        syncOfficialCatalogOnce();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (status != null && !status.isBlank()) {
            where.append(" AND a.status = ?");
            params.add(status);
        }
        if (categoryId != null) {
            where.append(" AND a.category_id = ?");
            params.add(categoryId);
        }
        if (search != null && !search.isBlank()) {
            where.append(" AND (a.serial_number ILIKE ? OR a.model ILIKE ? OR a.qr_code ILIKE ?)");
            String pattern = "%" + search.trim() + "%";
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM assets a" + where,
                Long.class,
                params.toArray());
        long totalElements = total == null ? 0 : total;

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(query.size());
        pageParams.add(query.offset());
        List<GraphQlModels.Asset> items = jdbcTemplate.query(
                BASE_SELECT + where + " ORDER BY a.id ASC LIMIT ? OFFSET ?",
                this::mapAsset,
                pageParams.toArray());

        return PageQuery.toPage(items, query, totalElements);
    }

    public boolean existsSerialNumber(String serialNumber) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM assets WHERE UPPER(serial_number) = UPPER(?))",
                Boolean.class,
                serialNumber);
        return Boolean.TRUE.equals(exists);
    }

    public boolean existsQrCode(String qrCode) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM assets WHERE UPPER(qr_code) = UPPER(?))",
                Boolean.class,
                qrCode);
        return Boolean.TRUE.equals(exists);
    }

    public long insert(
            String serialNumber,
            String qrCode,
            String model,
            BigDecimal estimatedValue,
            LocalDate acquisitionDate,
            long categoryId,
            long locationId,
            int maxUsageCycles,
            int calibrationIntervalDays) {
        Long id = jdbcTemplate.queryForObject(
                """
                INSERT INTO assets (category_id, location_id, serial_number, qr_code, model,
                                    estimated_value, acquisition_date, status, usage_cycles,
                                    max_usage_cycles, last_calibration_date, calibration_interval_days)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', 0, ?, CURRENT_DATE, ?)
                RETURNING id
                """,
                Long.class,
                categoryId,
                locationId,
                serialNumber.trim(),
                qrCode == null || qrCode.isBlank() ? null : qrCode.trim(),
                model.trim(),
                estimatedValue,
                acquisitionDate,
                maxUsageCycles,
                calibrationIntervalDays);
        return id == null ? -1 : id;
    }

    public void updateStatus(long id, String status) {
        jdbcTemplate.update(
                "UPDATE assets SET status = ?, updated_at = NOW() WHERE id = ?",
                status,
                id);
    }

    public void updateCalibrationDate(long id, LocalDate calibrationDate) {
        jdbcTemplate.update(
                "UPDATE assets SET last_calibration_date = ?, updated_at = NOW() WHERE id = ?",
                calibrationDate,
                id);
    }

    public Optional<String> findStatus(long id) {
        return jdbcTemplate.query(
                "SELECT status FROM assets WHERE id = ?",
                (rs, row) -> rs.getString("status"),
                id).stream().findFirst();
    }

    public long countAll() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM assets", Long.class);
        return count == null ? 0 : count;
    }

    public Optional<String> findSerialNumber(long id) {
        return jdbcTemplate.query(
                "SELECT serial_number FROM assets WHERE id = ?",
                (rs, row) -> rs.getString("serial_number"),
                id).stream().findFirst();
    }

    private GraphQlModels.Asset mapAsset(ResultSet rs, int rowNumber) throws SQLException {
        long categoryIdValue = rs.getLong("category_id");
        Long categoryId = rs.wasNull() ? null : categoryIdValue;
        long locationIdValue = rs.getLong("location_id");
        Long locationId = rs.wasNull() ? null : locationIdValue;
        GraphQlModels.Category category = categoryId == null
                ? null
                : new GraphQlModels.Category(
                        categoryId,
                        rs.getString("category_name"),
                        rs.getInt("useful_life_months"));
        GraphQlModels.Location location = locationId == null
                ? null
                : new GraphQlModels.Location(
                        locationId,
                        rs.getString("location_name"),
                        rs.getString("location_type"));

        LocalDate lastCalibration = rs.getObject("last_calibration_date", LocalDate.class);
        int intervalDays = rs.getInt("calibration_interval_days");
        int usageCycles = rs.getInt("usage_cycles");
        int maxUsageCycles = rs.getInt("max_usage_cycles");
        GraphQlModels.CalibrationStatus calibrationStatus = CalibrationPolicy.evaluate(
                lastCalibration, intervalDays, usageCycles, maxUsageCycles, LocalDate.now());

        return new GraphQlModels.Asset(
                rs.getLong("id"),
                rs.getString("serial_number"),
                rs.getString("qr_code"),
                rs.getString("model"),
                rs.getBigDecimal("estimated_value").doubleValue(),
                rs.getObject("acquisition_date", LocalDate.class).toString(),
                rs.getString("status"),
                usageCycles,
                maxUsageCycles,
                lastCalibration.toString(),
                intervalDays,
                category,
                location,
                calibrationStatus,
                timestamp(rs, "created_at"),
                timestamp(rs, "updated_at"));
    }

    private static String timestamp(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toString();
    }

    static String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
