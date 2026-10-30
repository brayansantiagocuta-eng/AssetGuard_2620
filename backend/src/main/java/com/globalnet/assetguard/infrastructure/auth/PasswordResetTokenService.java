package com.globalnet.assetguard.infrastructure.auth;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetTokenService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetTokenService.class);
    private static final Duration TOKEN_TTL = Duration.ofMinutes(30);
    private final JdbcTemplate jdbcTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetTokenService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Genera un token criptográfico seguro de 32 bytes (64 caracteres hex) con validez de 30 minutos.
     */
    public String createToken(long userId, String email) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String token = HexFormat.of().formatHex(randomBytes);

        String cleanEmail = email.trim().toLowerCase(Locale.ROOT);
        Instant expiresAt = Instant.now().plus(TOKEN_TTL);

        // Invalidar tokens previos no utilizados del mismo usuario
        jdbcTemplate.update(
                "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE",
                userId
        );

        jdbcTemplate.update(
                """
                INSERT INTO password_reset_tokens (token, user_id, email, expires_at, used, created_at)
                VALUES (?, ?, ?, ?, FALSE, NOW())
                """,
                token,
                userId,
                cleanEmail,
                Timestamp.from(expiresAt)
        );

        log.info("Token de recuperación generado para usuario ID {} (expira en {} min)", userId, TOKEN_TTL.toMinutes());
        return token;
    }

    /**
     * Valida si un token existe, no ha sido usado y aún no ha expirado.
     */
    public Optional<Long> verifyToken(String token, String email) {
        if (token == null || token.isBlank() || email == null || email.isBlank()) {
            return Optional.empty();
        }

        String cleanEmail = email.trim().toLowerCase(Locale.ROOT);
        try {
            Long userId = jdbcTemplate.queryForObject(
                    """
                    SELECT user_id FROM password_reset_tokens
                    WHERE token = ? AND LOWER(email) = ? AND used = FALSE AND expires_at > NOW()
                    """,
                    Long.class,
                    token.trim(),
                    cleanEmail
            );
            return Optional.ofNullable(userId);
        } catch (EmptyResultDataAccessException ex) {
            log.warn("Intento de validación fallido para token o email expirado/inválido: {}", cleanEmail);
            return Optional.empty();
        }
    }

    /**
     * Marca un token como consumido tras actualizar la contraseña exitosamente.
     */
    public void markAsUsed(String token) {
        if (token != null && !token.isBlank()) {
            jdbcTemplate.update(
                    "UPDATE password_reset_tokens SET used = TRUE WHERE token = ?",
                    token.trim()
            );
        }
    }
}
