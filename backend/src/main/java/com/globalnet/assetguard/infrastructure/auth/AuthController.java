package com.globalnet.assetguard.infrastructure.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final SessionService sessionService;
    private final SessionCookie sessionCookie;
    private final LoginRateLimiter loginRateLimiter;
    private final JdbcTemplate jdbcTemplate;

    public AuthController(
            UserRepository userRepository,
            PasswordHasher passwordHasher,
            SessionService sessionService,
            SessionCookie sessionCookie,
            LoginRateLimiter loginRateLimiter,
            JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.sessionService = sessionService;
        this.sessionCookie = sessionCookie;
        this.loginRateLimiter = loginRateLimiter;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping("/login")
    public AuthResponse login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        if (request.email() == null || request.password() == null
                || request.email().isBlank() || request.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Correo y contraseña son obligatorios.");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String rateLimitKey = loginRateLimiter.key(email, clientIp(httpRequest));
        loginRateLimiter.checkAllowed(rateLimitKey);

        Optional<UserRepository.StoredUser> storedUser = userRepository
                .findByEmail(email)
                .filter(user -> "ACTIVE".equals(user.user().status()))
                .filter(user -> passwordHasher.matches(request.password(), user.passwordHash()));

        if (storedUser.isEmpty()) {
            loginRateLimiter.recordFailure(rateLimitKey);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Correo o contraseña incorrectos.");
        }

        loginRateLimiter.reset(rateLimitKey);
        String token = sessionService.create(storedUser.get().user().id());
        sessionCookie.addSession(response, token);
        return new AuthResponse(storedUser.get().user());
    }

    @GetMapping("/me")
    public AuthResponse me(HttpServletRequest request) {
        AuthenticatedUser user = SessionFilter.getUser(request);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión no está autenticada.");
        }
        return new AuthResponse(user);
    }

    @PostMapping("/logout")
    public MessageResponse logout(HttpServletRequest request, HttpServletResponse response) {
        sessionService.revoke(SessionFilter.findCookie(request));
        sessionCookie.clear(response);
        return new MessageResponse("Sesión cerrada.");
    }

    @PostMapping("/password-recovery")
    public MessageResponse requestPasswordRecovery(
            @RequestBody PasswordRecoveryRequest request,
            HttpServletRequest httpRequest) {
        if (request == null || request.email() == null || request.email().isBlank() || !request.email().contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe ingresar un correo electrónico válido.");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        Optional<UserRepository.StoredUser> storedUser = userRepository.findByEmail(email);
        Long targetUserId = storedUser.map(u -> u.user().id()).orElse(null);

        jdbcTemplate.update(
                """
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
                VALUES (?, 'PASSWORD_RESET_REQUESTED', 'users', ?, NULL, ?::jsonb, ?)
                """,
                targetUserId,
                targetUserId,
                "{\"email\":\"" + email.replace("\"", "") + "\",\"status\":\"PENDING\"}",
                clientIp(httpRequest));

        return new MessageResponse("Solicitud enviada al Administrador del Sistema.");
    }

    @GetMapping("/database")
    public DatabaseHealth databaseHealth(HttpServletRequest request) {
        if (SessionFilter.getUser(request) == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión no está autenticada.");
        }
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        return new DatabaseHealth("UP");
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record LoginRequest(String email, String password) {
    }

    public record PasswordRecoveryRequest(String email) {
    }

    public record AuthResponse(AuthenticatedUser user) {
    }

    public record MessageResponse(String message) {
    }

    public record DatabaseHealth(String status) {
    }
}
