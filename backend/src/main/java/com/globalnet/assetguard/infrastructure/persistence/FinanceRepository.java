package com.globalnet.assetguard.infrastructure.persistence;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class FinanceRepository {

    private final JdbcTemplate jdbcTemplate;

    public FinanceRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Valor actual = valor estimado * (1 - meses transcurridos / vida util), con
     * piso en cero. Se calcula en la base para no arrastrar redondeos en Java.
     */
    public GraphQlModels.FinancialSummary summary() {
        return jdbcTemplate.queryForObject(
                """
                WITH depreciation AS (
                    SELECT a.id,
                           a.estimated_value,
                           GREATEST(
                               0,
                               a.estimated_value * (
                                   1 - (
                                       (DATE_PART('year', AGE(CURRENT_DATE, a.acquisition_date)) * 12
                                        + DATE_PART('month', AGE(CURRENT_DATE, a.acquisition_date)))
                                       / GREATEST(COALESCE(c.useful_life_months, 60), 1)
                                   )
                               )
                           ) AS current_value
                    FROM assets a
                    LEFT JOIN categories c ON c.id = a.category_id
                )
                SELECT
                    (SELECT COUNT(*) FROM assets) AS total_assets,
                    (SELECT COALESCE(SUM(estimated_value), 0) FROM depreciation) AS acquisition_value,
                    (SELECT COALESCE(SUM(current_value), 0) FROM depreciation) AS current_value,
                    (SELECT COUNT(DISTINCT asset_id) FROM loans WHERE status = 'OVERDUE') AS overdue_assets,
                    (SELECT COALESCE(SUM(a.estimated_value), 0)
                       FROM assets a
                      WHERE a.status = 'MAINTENANCE'
                         OR EXISTS (SELECT 1 FROM loans l WHERE l.asset_id = a.id AND l.status = 'OVERDUE')
                         OR (a.last_calibration_date + a.calibration_interval_days) < CURRENT_DATE
                    ) AS value_at_risk
                """,
                (rs, row) -> new GraphQlModels.FinancialSummary(
                        rs.getInt("total_assets"),
                        rs.getBigDecimal("acquisition_value").doubleValue(),
                        rs.getBigDecimal("current_value").doubleValue(),
                        rs.getInt("overdue_assets"),
                        rs.getBigDecimal("value_at_risk").doubleValue(),
                        "COP"));
    }
}
