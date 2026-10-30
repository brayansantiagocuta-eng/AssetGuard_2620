package com.globalnet.assetguard.infrastructure.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

    public static final String COOKIE_NAME = "assetguard_session";

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Duration sessionDuration;
    private final boolean secureCookie;

    public SessionService(
            JdbcTemplate jdbcTemplate,
            UserRepository userRepository,
            @Value("${assetguard.auth.session-hours:8}") long sessionHours,
            @Value("${assetguard.auth.cookie-secure:false}") boolean secureCookie) {
        if (sessionHours < 1 || sessionHours > 168) {
            throw new IllegalArgumentException("Session duration must be between 1 and 168 hours.");
        }
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
        this.sessionDuration = Duration.ofHours(sessionHours);
        this.secureCookie = secureCookie;
    }

    public String create(long userId) {
        // Limpia sesiones expiradas y sesiones anteriores del mismo usuario para evitar colisiones
        jdbcTemplate.update("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
        jdbcTemplate.update("DELETE FROM auth_sessions WHERE user_id = ?", userId);
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        jdbcTemplate.update(
                """
                INSERT INTO auth_sessions (token_hash, user_id, expires_at)
                VALUES (?, ?, ?)
                """,
                hashToken(token),
                userId,
                OffsetDateTime.now().plus(sessionDuration));
        return token;
    }

    public Optional<AuthenticatedUser> findUser(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        List<Long> userIds = jdbcTemplate.query(
                """
                SELECT s.user_id
                FROM auth_sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = ?
                  AND s.expires_at > NOW()
                  AND u.status = 'ACTIVE'
                """,
                (resultSet, rowNumber) -> resultSet.getLong("user_id"),
                hashToken(token));
        return userIds.stream().findFirst().flatMap(userRepository::findById);
    }

    public void revoke(String token) {
        if (token != null && !token.isBlank()) {
            jdbcTemplate.update("DELETE FROM auth_sessions WHERE token_hash = ?", hashToken(token));
        }
    }

    public Duration getSessionDuration() {
        return sessionDuration;
    }

    public boolean isSecureCookie() {
        return secureCookie;
    }

    private String hashToken(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash the session token.", exception);
        }
    }
}
