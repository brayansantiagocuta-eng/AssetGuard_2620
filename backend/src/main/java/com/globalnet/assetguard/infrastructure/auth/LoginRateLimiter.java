package com.globalnet.assetguard.infrastructure.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Limita los intentos fallidos de inicio de sesion por combinacion correo + IP.
 * Ventana deslizante en memoria: suficiente para una instancia; en un despliegue
 * con varias instancias debe respaldarse en un almacen compartido.
 */
@Component
public class LoginRateLimiter {

    static final int MAX_ATTEMPTS = 5;
    static final Duration WINDOW = Duration.ofMinutes(10);

    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    public String key(String email, String ipAddress) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);
        String normalizedIp = ipAddress == null ? "unknown" : ipAddress;
        return normalizedIp + "|" + normalizedEmail;
    }

    public void checkAllowed(String key) {
        Deque<Instant> timestamps = attempts.get(key);
        if (timestamps == null) {
            return;
        }
        synchronized (timestamps) {
            prune(timestamps);
            if (timestamps.size() >= MAX_ATTEMPTS) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.");
            }
        }
    }

    public void recordFailure(String key) {
        Deque<Instant> timestamps = attempts.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (timestamps) {
            prune(timestamps);
            timestamps.addLast(Instant.now());
        }
    }

    public void reset(String key) {
        attempts.remove(key);
    }

    private static void prune(Deque<Instant> timestamps) {
        Instant threshold = Instant.now().minus(WINDOW);
        while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(threshold)) {
            timestamps.removeFirst();
        }
    }
}
