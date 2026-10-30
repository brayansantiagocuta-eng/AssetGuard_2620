package com.globalnet.assetguard.infrastructure.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SessionFilter extends OncePerRequestFilter {

    public static final String USER_ATTRIBUTE = SessionFilter.class.getName() + ".user";

    private final SessionService sessionService;

    public SessionFilter(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/") && !"/graphql".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");

        // 1. Primero verifica token de sesión en encabezado Authorization o X-Session-Token
        String authHeader = request.getHeader("Authorization");
        String headerToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            headerToken = authHeader.substring(7).trim();
        }
        if (headerToken == null || headerToken.isBlank()) {
            headerToken = request.getHeader("X-Session-Token");
        }
        if (headerToken != null && !headerToken.isBlank()) {
            Optional<AuthenticatedUser> user = sessionService.findUser(headerToken);
            if (user.isPresent()) {
                request.setAttribute(USER_ATTRIBUTE, user.get());
            }
        }

        // 2. Si no vino en encabezados, verifica cookies
        if (request.getAttribute(USER_ATTRIBUTE) == null) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                // Recorre los cookies buscando el que tenga una sesión activa válida en base de datos
                for (Cookie cookie : cookies) {
                    if (SessionService.COOKIE_NAME.equals(cookie.getName())) {
                        Optional<AuthenticatedUser> user = sessionService.findUser(cookie.getValue());
                        if (user.isPresent()) {
                            request.setAttribute(USER_ATTRIBUTE, user.get());
                            break;
                        }
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    public static AuthenticatedUser getUser(HttpServletRequest request) {
        Object user = request.getAttribute(USER_ATTRIBUTE);
        return user instanceof AuthenticatedUser authenticatedUser ? authenticatedUser : null;
    }

    public static String findCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (SessionService.COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
