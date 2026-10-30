package com.globalnet.assetguard.infrastructure.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class LoginRateLimiterTest {

    private final LoginRateLimiter limiter = new LoginRateLimiter();

    @Test
    void blocksAfterFiveFailuresWithinTheWindow() {
        String key = limiter.key("technician@globalnet.com", "127.0.0.1");
        for (int attempt = 0; attempt < LoginRateLimiter.MAX_ATTEMPTS; attempt++) {
            assertDoesNotThrow(() -> limiter.checkAllowed(key));
            limiter.recordFailure(key);
        }

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, () -> limiter.checkAllowed(key));
        org.junit.jupiter.api.Assertions.assertEquals(
                HttpStatus.TOO_MANY_REQUESTS, exception.getStatusCode());
    }

    @Test
    void successfulLoginResetsTheCounter() {
        String key = limiter.key("admin@globalnet.com", "10.0.0.5");
        for (int attempt = 0; attempt < 10; attempt++) {
            limiter.recordFailure(key);
        }
        limiter.reset(key);

        assertDoesNotThrow(() -> limiter.checkAllowed(key));
    }

    @Test
    void separatesKeysByEmailAndIp() {
        String blocked = limiter.key("admin@globalnet.com", "10.0.0.5");
        String otherIp = limiter.key("admin@globalnet.com", "10.0.0.6");
        for (int attempt = 0; attempt < LoginRateLimiter.MAX_ATTEMPTS; attempt++) {
            limiter.recordFailure(blocked);
        }

        assertThrows(ResponseStatusException.class, () -> limiter.checkAllowed(blocked));
        assertDoesNotThrow(() -> limiter.checkAllowed(otherIp));
    }
}