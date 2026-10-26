package com.globalnet.assetguard.infrastructure.persistence;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LoanRepository {

    private final JdbcTemplate jdbcTemplate;

    public LoanRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------ solicitudes

    public Optional<RequestRow> findRequestById(long id) {
        return jdbcTemplate.query(
                """
                SELECT id, technician_id, asset_id, request_date, required_date, expected_return_date,
                       motive, status, created_at
                FROM loan_requests WHERE id = ?
                """,
                this::mapRequest,
                id).stream().findFirst();
    }

    public GraphQlModels.Page<RequestRow> findRequests(String status, PageQuery query) {
        String where = status == null || status.isBlank() ? "" : " WHERE status = ?";
        Object[] countParams = where.isEmpty() ? new Object[] {} : new Object[] { status };
        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM loan_requests" + where, Long.class, countParams);
        long totalElements = total == null ? 0 : total;

        List<Object> params = new ArrayList<>();
        if (!where.isEmpty()) {
            params.add(status);
        }
        params.add(query.size());
        params.add(query.offset());
        List<RequestRow> items = jdbcTemplate.query(
                """
                SELECT id, technician_id, asset_id, request_date, required_date, expected_return_date,
                       motive, status, created_at
                FROM loan_requests
                """ + where + " ORDER BY id DESC LIMIT ? OFFSET ?",
                this::mapRequest,
                params.toArray());
        return PageQuery.toPage(items, query, totalElements);
    }

    public long insertRequest(
            long technicianId,
            long assetId,
            LocalDate requiredDate,
            LocalDate expectedReturnDate,
            String motive) {
        Long id = jdbcTemplate.queryForObject(
                """
                INSERT INTO loan_requests (technician_id, asset_id, required_date, expected_return_date, motive)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id
                """,
                Long.class,
                technicianId,
                assetId,
                requiredDate,
                expectedReturnDate,
                motive);
        return id == null ? -1 : id;
    }

    public void updateRequestStatus(long id, String status) {
        jdbcTemplate.update("UPDATE loan_requests SET status = ? WHERE id = ?", status, id);
    }

    /** true si el activo ya tiene una solicitud pendiente o aprobada. */
    public boolean hasOpenRequest(long assetId) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM loan_requests
                    WHERE asset_id = ? AND status IN ('REQUESTED', 'APPROVED')
                )
                """,
                Boolean.class,
                assetId);
        return Boolean.TRUE.equals(exists);
    }

    public boolean hasOpenRequestExcluding(long assetId, long requestId) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM loan_requests
                    WHERE asset_id = ? AND status IN ('REQUESTED', 'APPROVED') AND id <> ?
                )
                """,
                Boolean.class,
                assetId,
                requestId);
        return Boolean.TRUE.equals(exists);
    }

    /** true si el activo tiene un prestamo vigente o vencido sin devolver. */
    public boolean hasActiveLoan(long assetId) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM loans WHERE asset_id = ? AND status IN ('ACTIVE', 'OVERDUE'))",
                Boolean.class,
                assetId);
        return Boolean.TRUE.equals(exists);
    }

    // ------------------------------------------------------------------ OTP

    public Optional<OtpRow> findActiveOtp(long loanRequestId) {
        return jdbcTemplate.query(
                """
                SELECT id, loan_request_id, pin_hash, expires_at, attempts, used
                FROM otp_tokens
                WHERE loan_request_id = ? AND used = FALSE
                ORDER BY id DESC LIMIT 1
                """,
                this::mapOtp,
                loanRequestId).stream().findFirst();
    }

    public long insertOtp(long loanRequestId, String pinHash, OffsetDateTime expiresAt) {
        Long id = jdbcTemplate.queryForObject(
                """
                INSERT INTO otp_tokens (loan_request_id, pin_hash, expires_at)
                VALUES (?, ?, ?)
                RETURNING id
                """,
                Long.class,
                loanRequestId,
                pinHash,
                expiresAt);
        return id == null ? -1 : id;
    }

    public void invalidateOtps(long loanRequestId) {
        jdbcTemplate.update(
                "UPDATE otp_tokens SET used = TRUE WHERE loan_request_id = ? AND used = FALSE",
                loanRequestId);
    }

    public void incrementOtpAttempts(long otpId) {
        jdbcTemplate.update("UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = ?", otpId);
    }

    public void markOtpUsed(long otpId) {
        jdbcTemplate.update("UPDATE otp_tokens SET used = TRUE WHERE id = ?", otpId);
    }

    // ------------------------------------------------------------------ prestamos

    public long insertLoan(long loanRequestId, long assetId) {
        Long id = jdbcTemplate.queryForObject(
                """
                INSERT INTO loans (loan_request_id, asset_id, status)
                VALUES (?, ?, 'ACTIVE')
                RETURNING id
                """,
                Long.class,
                loanRequestId,
                assetId);
        return id == null ? -1 : id;
    }

    public Optional<LoanRow> findLoanById(long id) {
        return jdbcTemplate.query(
                """
                SELECT id, loan_request_id, asset_id, delivery_date, actual_return_date, status, notes
                FROM loans WHERE id = ?
                """,
                this::mapLoan,
                id).stream().findFirst();
    }

    public Optional<LoanRow> findLoanByRequestId(long loanRequestId) {
        return jdbcTemplate.query(
                """
                SELECT id, loan_request_id, asset_id, delivery_date, actual_return_date, status, notes
                FROM loans WHERE loan_request_id = ?
                """,
                this::mapLoan,
                loanRequestId).stream().findFirst();
    }

    public GraphQlModels.Page<LoanRow> findLoans(
            String status,
            Long technicianId,
            PageQuery query) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (status == null || status.isBlank()) {
            where.append(" AND l.status IN ('ACTIVE', 'OVERDUE')");
        } else {
            where.append(" AND l.status = ?");
            params.add(status);
        }
        if (technicianId != null) {
            where.append(" AND r.technician_id = ?");
            params.add(technicianId);
        }

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM loans l JOIN loan_requests r ON r.id = l.loan_request_id" + where,
                Long.class,
                params.toArray());
        long totalElements = total == null ? 0 : total;

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(query.size());
        pageParams.add(query.offset());
        List<LoanRow> items = jdbcTemplate.query(
                """
                SELECT l.id, l.loan_request_id, l.asset_id, l.delivery_date, l.actual_return_date,
                       l.status, l.notes
                FROM loans l
                JOIN loan_requests r ON r.id = l.loan_request_id
                """ + where + " ORDER BY l.id DESC LIMIT ? OFFSET ?",
                this::mapLoan,
                pageParams.toArray());
        return PageQuery.toPage(items, query, totalElements);
    }

    public void markReturned(long loanId, String notes) {
        jdbcTemplate.update(
                """
                UPDATE loans
                SET actual_return_date = NOW(), status = 'RETURNED', notes = COALESCE(?, notes)
                WHERE id = ?
                """,
                notes,
                loanId);
    }

    /** Migra ACTIVE -> OVERDUE los prestamos cuya fecha esperada de devolucion ya paso. */
    public List<OverdueRow> markOverdueLoans() {
        return jdbcTemplate.query(
                """
                UPDATE loans l
                SET status = 'OVERDUE'
                FROM loan_requests r
                WHERE l.loan_request_id = r.id
                  AND l.status = 'ACTIVE'
                  AND r.expected_return_date < CURRENT_DATE
                RETURNING l.id, l.asset_id, r.technician_id
                """,
                (rs, row) -> new OverdueRow(
                        rs.getLong("id"), rs.getLong("asset_id"), rs.getLong("technician_id")));
    }

    // ------------------------------------------------------------------ mapeo

    private RequestRow mapRequest(ResultSet rs, int row) throws SQLException {
        return new RequestRow(
                rs.getLong("id"),
                rs.getLong("technician_id"),
                rs.getLong("asset_id"),
                timestamp(rs, "request_date"),
                rs.getObject("required_date", LocalDate.class).toString(),
                rs.getObject("expected_return_date", LocalDate.class).toString(),
                rs.getString("motive"),
                rs.getString("status"),
                timestamp(rs, "created_at"));
    }

    private OtpRow mapOtp(ResultSet rs, int row) throws SQLException {
        return new OtpRow(
                rs.getLong("id"),
                rs.getLong("loan_request_id"),
                rs.getString("pin_hash"),
                rs.getObject("expires_at", OffsetDateTime.class),
                rs.getInt("attempts"),
                rs.getBoolean("used"));
    }

    private LoanRow mapLoan(ResultSet rs, int row) throws SQLException {
        OffsetDateTime returned = rs.getObject("actual_return_date", OffsetDateTime.class);
        return new LoanRow(
                rs.getLong("id"),
                rs.getLong("loan_request_id"),
                rs.getLong("asset_id"),
                timestamp(rs, "delivery_date"),
                returned == null ? null : returned.toString(),
                rs.getString("status"),
                rs.getString("notes"));
    }

    private static String timestamp(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toString();
    }

    public record RequestRow(
            long id,
            long technicianId,
            long assetId,
            String requestDate,
            String requiredDate,
            String expectedReturnDate,
            String motive,
            String status,
            String createdAt) {
    }

    public record OtpRow(
            long id,
            long loanRequestId,
            String pinHash,
            OffsetDateTime expiresAt,
            int attempts,
            boolean used) {
    }

    public record LoanRow(
            long id,
            long loanRequestId,
            long assetId,
            String deliveryDate,
            String actualReturnDate,
            String status,
            String notes) {
    }

    public record OverdueRow(long loanId, long assetId, long technicianId) {
    }
}
