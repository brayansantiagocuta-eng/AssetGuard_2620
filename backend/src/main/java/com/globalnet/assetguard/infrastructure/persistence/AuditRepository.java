package com.globalnet.assetguard.infrastructure.persistence;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuditRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuditRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void insert(
            Long userId,
            String action,
            String entityName,
            Long entityId,
            String oldValue,
            String newValue,
            String ipAddress) {
        jdbcTemplate.update(
                """
                INSERT INTO audit_logs (user_id, action, entity_name, entity_id, old_value, new_value, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                userId,
                action,
                entityName,
                entityId,
                oldValue,
                newValue,
                ipAddress);
    }

    public GraphQlModels.Page<GraphQlModels.AuditLog> findPage(
            String action,
            String entityName,
            PageQuery query) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (action != null && !action.isBlank()) {
            where.append(" AND a.action = ?");
            params.add(action);
        }
        if (entityName != null && !entityName.isBlank()) {
            where.append(" AND a.entity_name = ?");
            params.add(entityName);
        }

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_logs a" + where, Long.class, params.toArray());
        long totalElements = total == null ? 0 : total;

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(query.size());
        pageParams.add(query.offset());
        List<GraphQlModels.AuditLog> items = jdbcTemplate.query(
                """
                SELECT a.id, a.user_id, u.full_name AS user_full_name, a.action, a.entity_name,
                       a.entity_id, a.old_value, a.new_value, a.ip_address, a.created_at
                FROM audit_logs a
                LEFT JOIN users u ON u.id = a.user_id
                """ + where + " ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?",
                this::mapAuditLog,
                pageParams.toArray());
        return PageQuery.toPage(items, query, totalElements);
    }

    public void insertJobExecution(String jobName, String status, int recordsProcessed, String details) {
        jdbcTemplate.update(
                """
                INSERT INTO job_executions (job_name, status, records_processed, details)
                VALUES (?, ?, ?, ?)
                """,
                jobName,
                status,
                recordsProcessed,
                details);
    }

    public GraphQlModels.Page<GraphQlModels.JobExecution> findJobExecutions(PageQuery query) {
        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM job_executions", Long.class);
        long totalElements = total == null ? 0 : total;

        List<GraphQlModels.JobExecution> items = jdbcTemplate.query(
                """
                SELECT id, job_name, executed_at, status, records_processed, details
                FROM job_executions
                ORDER BY executed_at DESC, id DESC
                LIMIT ? OFFSET ?
                """,
                this::mapJobExecution,
                query.size(),
                query.offset());
        return PageQuery.toPage(items, query, totalElements);
    }

    private GraphQlModels.JobExecution mapJobExecution(ResultSet rs, int row) throws SQLException {
        OffsetDateTime executedAt = rs.getObject("executed_at", OffsetDateTime.class);
        return new GraphQlModels.JobExecution(
                rs.getLong("id"),
                rs.getString("job_name"),
                executedAt == null ? null : executedAt.toString(),
                rs.getString("status"),
                rs.getInt("records_processed"),
                rs.getString("details"));
    }

    private GraphQlModels.AuditLog mapAuditLog(ResultSet rs, int row) throws SQLException {
        Long userId = rs.getObject("user_id", Long.class);
        Long entityId = rs.getObject("entity_id", Long.class);
        OffsetDateTime createdAt = rs.getObject("created_at", OffsetDateTime.class);
        return new GraphQlModels.AuditLog(
                rs.getLong("id"),
                userId,
                rs.getString("user_full_name"),
                rs.getString("action"),
                rs.getString("entity_name"),
                entityId,
                rs.getString("old_value"),
                rs.getString("new_value"),
                rs.getString("ip_address"),
                createdAt == null ? null : createdAt.toString());
    }
}
