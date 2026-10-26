package com.globalnet.assetguard.infrastructure.auth;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class SessionCookie {

    private final SessionService sessionService;

    public SessionCookie(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    public void addSession(HttpServletResponse response, String token) {
        response.addHeader("Set-Cookie", ResponseCookie.from(SessionService.COOKIE_NAME, token)
                .httpOnly(true)
                .secure(sessionService.isSecureCookie())
                .sameSite("Strict")
                .path("/")
                .maxAge(sessionService.getSessionDuration())
                .build()
                .toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader("Set-Cookie", ResponseCookie.from(SessionService.COOKIE_NAME, "")
                .httpOnly(true)
                .secure(sessionService.isSecureCookie())
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build()
                .toString());
    }
}
