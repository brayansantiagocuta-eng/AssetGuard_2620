package com.globalnet.assetguard.infrastructure.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Proteccion CSRF para peticiones que cambian estado: acepta el propio origen
 * del servidor o los origenes configurados (APP_ORIGIN, separados por coma).
 */
@Component
public class SameOriginFilter extends OncePerRequestFilter {

    private final Set<String> allowedOrigins;

    public SameOriginFilter(@Value("${assetguard.auth.allowed-origin:http://localhost:3000}") String allowedOrigin) {
        this.allowedOrigins = Arrays.stream(allowedOrigin.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(SameOriginFilter::normalize)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (!isStateChanging(request)) {
            filterChain.doFilter(request, response);
            return;
        }
        String origin = request.getHeader("Origin");
        String fetchSite = request.getHeader("Sec-Fetch-Site");
        boolean crossSite = "cross-site".equalsIgnoreCase(fetchSite);
        boolean allowed = origin == null || origin.isBlank()
                ? !crossSite
                : isAllowed(origin) || isSameServer(request, origin);
        if (!allowed) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"message\":\"El origen de la solicitud no está permitido.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isStateChanging(HttpServletRequest request) {
        String method = request.getMethod();
        return "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
    }

    private boolean isAllowed(String origin) {
        return allowedOrigins.contains(normalize(origin));
    }

    private boolean isSameServer(HttpServletRequest request, String origin) {
        String requestOrigin = normalize(
                request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort());
        return requestOrigin.equals(normalize(origin));
    }

    private static String normalize(String origin) {
        return origin.trim().toLowerCase(Locale.ROOT).replaceAll("/+$", "");
    }
}
