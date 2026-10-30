package com.globalnet.assetguard.infrastructure.auth;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private static final String USER_COLUMNS = """
            SELECT u.id, r.name AS role, u.full_name, u.email, u.status
            FROM users u
            JOIN roles r ON r.id = u.role_id
            """;
    private static final String VIEW_COLUMNS = """
            SELECT u.id, r.name AS role, u.full_name, u.email, u.status, u.created_at, u.updated_at
            FROM users u
            JOIN roles r ON r.id = u.role_id
            """;
    private static final String LOGIN_USER_COLUMNS = """
            SELECT u.id, r.name AS role, u.full_name, u.email, u.status, u.password_hash
            FROM users u
            JOIN roles r ON r.id = u.role_id
            """;

    private final JdbcTemplate jdbcTemplate;
    private final AtomicBoolean usersSynced = new AtomicBoolean(false);

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private void syncOfficialUsersOnce() {
        if (!usersSynced.compareAndSet(false, true)) {
            return;
        }
        try {
            jdbcTemplate.update("""
                    UPDATE users
                    SET full_name = 'Angie Ramos',
                        email = 'valesotelo.0806@gmail.com'
                    WHERE id = 1
                       OR email = 'admin@globalnet.com'
                       OR (role_id = (SELECT id FROM roles WHERE name = 'ADMIN') AND (full_name LIKE '%Carlos%' OR full_name LIKE '%Ramirez%' OR full_name LIKE '%Admin%'))
                    """);
            jdbcTemplate.update("""
                    UPDATE users
                    SET full_name = 'Ian Sanchez',
                        email = 'lasanita0204@gmail.com'
                    WHERE id = 2
                       OR email = 'inspector@globalnet.com'
                       OR (role_id = (SELECT id FROM roles WHERE name = 'INSPECTOR') AND (full_name LIKE '%Andres%' OR full_name LIKE '%Gomez%' OR full_name LIKE '%Inspector%'))
                    """);
            jdbcTemplate.update("""
                    UPDATE users
                    SET full_name = 'Brayan Cuta',
                        email = 'brayansantiagocuta@gmail.com'
                    WHERE id = 3
                       OR email = 'technician@globalnet.com'
                       OR email = 'tecnico@globalnet.com'
                       OR (role_id = (SELECT id FROM roles WHERE name = 'TECHNICIAN') AND (full_name LIKE '%Mateo%' OR full_name LIKE '%Laura%' OR full_name LIKE '%Tecnico%'))
                    """);
            jdbcTemplate.update("""
                    UPDATE roles SET description = 'Directora de Logistica - Control total del sistema' WHERE name = 'ADMIN';
                    UPDATE roles SET description = 'Encargado de Bodega - Inspeccion y entrega de activos' WHERE name = 'INSPECTOR';
                    UPDATE roles SET description = 'Tecnico Especialista de Campo - Solicitud y custodia' WHERE name = 'TECHNICIAN';
                    """);
        } catch (Exception ignored) {
            // Ignorado si la base de datos aun no esta migrada
        }
    }

    public Optional<StoredUser> findByEmail(String email) {
        syncOfficialUsersOnce();
        List<StoredUser> results = jdbcTemplate.query(
                LOGIN_USER_COLUMNS + " WHERE LOWER(u.email) = LOWER(?)",
                (resultSet, rowNumber) -> new StoredUser(
                        mapUser(resultSet),
                        resultSet.getString("password_hash")),
                email);
        return results.stream().findFirst();
    }

    public Optional<AuthenticatedUser> findById(long id) {
        syncOfficialUsersOnce();
        List<AuthenticatedUser> results = jdbcTemplate.query(
                USER_COLUMNS + " WHERE u.id = ?",
                (resultSet, rowNumber) -> mapUser(resultSet),
                id);
        return results.stream().findFirst();
    }

    public List<AuthenticatedUser> findAll() {
        syncOfficialUsersOnce();
        return jdbcTemplate.query(
                USER_COLUMNS + " ORDER BY u.created_at DESC, u.id DESC",
                (resultSet, rowNumber) -> mapUser(resultSet));
    }

    public long create(String fullName, String email, String passwordHash, String role) {
        return jdbcTemplate.queryForObject(
                """
                INSERT INTO users (role_id, full_name, email, password_hash)
                SELECT id, ?, ?, ? FROM roles WHERE name = ?
                RETURNING id
                """,
                Long.class,
                fullName,
                email,
                passwordHash,
                role);
    }

    public Optional<AuthenticatedUser> update(
            long id,
            String fullName,
            String role,
            String status) {
        int updatedRows = jdbcTemplate.update(
                """
                UPDATE users
                SET full_name = COALESCE(?, full_name),
                    role_id = COALESCE((SELECT id FROM roles WHERE name = ?), role_id),
                    status = COALESCE(?, status),
                    updated_at = NOW()
                WHERE id = ?
                """,
                fullName,
                role,
                status,
                id);
        return updatedRows == 0 ? Optional.empty() : findById(id);
    }

    public boolean updatePassword(long id, String passwordHash) {
        try {
            jdbcTemplate.update("""
                CREATE TABLE IF NOT EXISTS password_history (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """);
            jdbcTemplate.update("""
                INSERT INTO password_history (user_id, password_hash)
                SELECT id, password_hash FROM users WHERE id = ?
            """, id);
        } catch (Exception ignored) {
        }

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE users
                SET password_hash = ?,
                    updated_at = NOW()
                WHERE id = ?
                """,
                passwordHash,
                id);
        return updatedRows > 0;
    }

    public boolean isPasswordPreviouslyUsed(long userId, String rawPassword, PasswordHasher hasher) {
        try {
            // 1. Verificar si coincide con la contraseña actual
            String currentHash = jdbcTemplate.queryForObject(
                    "SELECT password_hash FROM users WHERE id = ?",
                    String.class,
                    userId);
            if (currentHash != null && hasher.matches(rawPassword, currentHash)) {
                return true;
            }

            // 2. Verificar si coincide con alguna del historial previo
            jdbcTemplate.update("""
                CREATE TABLE IF NOT EXISTS password_history (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """);
            List<String> pastHashes = jdbcTemplate.query(
                    "SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
                    (resultSet, rowNumber) -> resultSet.getString("password_hash"),
                    userId);
            for (String pastHash : pastHashes) {
                if (hasher.matches(rawPassword, pastHash)) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    public int countActiveAdministrators() {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM users u
                JOIN roles r ON r.id = u.role_id
                WHERE r.name = 'ADMIN' AND u.status = 'ACTIVE'
                """,
                Integer.class);
        return count == null ? 0 : count;
    }

    // ------------------------------------------------------------------ GraphQL

    public Optional<GraphQlModels.User> findViewById(long id) {
        syncOfficialUsersOnce();
        return jdbcTemplate.query(
                VIEW_COLUMNS + " WHERE u.id = ?",
                (resultSet, rowNumber) -> mapView(resultSet),
                id).stream().findFirst();
    }

    public GraphQlModels.Page<GraphQlModels.User> findPage(
            String role,
            String status,
            PageQuery query) {
        syncOfficialUsersOnce();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (role != null && !role.isBlank()) {
            where.append(" AND r.name = ?");
            params.add(role);
        }
        if (status != null && !status.isBlank()) {
            where.append(" AND u.status = ?");
            params.add(status);
        }

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id" + where,
                Long.class,
                params.toArray());
        long totalElements = total == null ? 0 : total;

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(query.size());
        pageParams.add(query.offset());
        List<GraphQlModels.User> items = jdbcTemplate.query(
                VIEW_COLUMNS + where + " ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?",
                (resultSet, rowNumber) -> mapView(resultSet),
                pageParams.toArray());
        return PageQuery.toPage(items, query, totalElements);
    }

    public boolean emailExists(String email) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM users WHERE LOWER(email) = LOWER(?))",
                Boolean.class,
                email);
        return Boolean.TRUE.equals(exists);
    }

    /**
     * Crea el administrador de arranque solo si no existe. Nunca sobrescribe la
     * contrasena ni el estado de una cuenta ya creada.
     */
    public Optional<Long> createBootstrapAdministratorIfMissing(
            String fullName,
            String email,
            String passwordHash) {
        Long id = jdbcTemplate.queryForObject(
                """
                INSERT INTO users (role_id, full_name, email, password_hash, status)
                SELECT id, ?, ?, ?, 'ACTIVE' FROM roles WHERE name = 'ADMIN'
                ON CONFLICT (email) DO NOTHING
                RETURNING id
                """,
                Long.class,
                fullName,
                email,
                passwordHash);
        return Optional.ofNullable(id);
    }

    private GraphQlModels.User mapView(java.sql.ResultSet resultSet) throws java.sql.SQLException {
        OffsetDateTime createdAt = resultSet.getObject("created_at", OffsetDateTime.class);
        OffsetDateTime updatedAt = resultSet.getObject("updated_at", OffsetDateTime.class);
        return new GraphQlModels.User(
                resultSet.getLong("id"),
                resultSet.getString("role"),
                resultSet.getString("full_name"),
                resultSet.getString("email"),
                resultSet.getString("status"),
                createdAt == null ? null : createdAt.toString(),
                updatedAt == null ? null : updatedAt.toString());
    }

    private AuthenticatedUser mapUser(java.sql.ResultSet resultSet) throws java.sql.SQLException {
        return new AuthenticatedUser(
                resultSet.getLong("id"),
                resultSet.getString("role"),
                resultSet.getString("full_name"),
                resultSet.getString("email"),
                resultSet.getString("status"));
    }

    public record StoredUser(AuthenticatedUser user, String passwordHash) {
    }
}
