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
    public static final String TOKEN_ATTRIBUTE = SessionFilter.class.getName() + ".token";

    private final SessionService sessionService;
    private final UserRepository userRepository;

    public SessionFilter(SessionService sessionService, UserRepository userRepository) {
        this.sessionService = sessionService;
        this.userRepository = userRepository;
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

        String tabEmail = request.getHeader("X-Tab-User-Email");

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
                request.setAttribute(TOKEN_ATTRIBUTE, headerToken);
            }
        }

        // 2. Si la pestaña indica explícitamente su usuario activo y el token compartido era de otra pestaña o expiró
        if (tabEmail != null && !tabEmail.isBlank()) {
            AuthenticatedUser current = getUser(request);
            if (current == null || !current.email().equalsIgnoreCase(tabEmail.trim())) {
                userRepository.findByEmail(tabEmail.trim())
                        .map(UserRepository.StoredUser::user)
                        .filter(u -> "ACTIVE".equals(u.status()))
                        .ifPresent(u -> request.setAttribute(USER_ATTRIBUTE, u));
            }
        }

        // 3. Si no vino en encabezados, verifica cookies
        if (request.getAttribute(USER_ATTRIBUTE) == null) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if (SessionService.COOKIE_NAME.equals(cookie.getName())) {
                        Optional<AuthenticatedUser> user = sessionService.findUser(cookie.getValue());
                        if (user.isPresent()) {
                            request.setAttribute(USER_ATTRIBUTE, user.get());
                            request.setAttribute(TOKEN_ATTRIBUTE, cookie.getValue());
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

    public static String findToken(HttpServletRequest request) {
        Object attrToken = request.getAttribute(TOKEN_ATTRIBUTE);
        if (attrToken instanceof String s && !s.isBlank()) {
            return s;
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String t = authHeader.substring(7).trim();
            if (!t.isBlank()) return t;
        }
        String sessionHeader = request.getHeader("X-Session-Token");
        if (sessionHeader != null && !sessionHeader.isBlank()) {
            return sessionHeader.trim();
        }
        return findCookie(request);
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
