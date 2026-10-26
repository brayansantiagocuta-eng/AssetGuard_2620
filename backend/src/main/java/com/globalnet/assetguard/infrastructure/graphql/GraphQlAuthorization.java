package com.globalnet.assetguard.infrastructure.graphql;

import com.globalnet.assetguard.domain.RoleType;
import com.globalnet.assetguard.infrastructure.auth.AuthenticatedUser;
import com.globalnet.assetguard.infrastructure.auth.SessionFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Resuelve el usuario autenticado de la peticion GraphQL actual. La sesion la
 * cargo SessionFilter a partir de la cookie HttpOnly antes de llegar al resolver.
 */
@Component
public class GraphQlAuthorization {

    public AuthenticatedUser currentUser() {
        HttpServletRequest request = currentRequest();
        return request == null ? null : SessionFilter.getUser(request);
    }

    public AuthenticatedUser requireUser() {
        AuthenticatedUser user = currentUser();
        if (user == null) {
            throw ApiException.unauthorized("Debes iniciar sesión para realizar esta operación.");
        }
        return user;
    }

    public AuthenticatedUser requireRole(RoleType... roles) {
        AuthenticatedUser user = requireUser();
        for (RoleType role : roles) {
            if (role.name().equals(user.role())) {
                return user;
            }
        }
        throw ApiException.forbidden("No tienes permisos para realizar esta operación.");
    }

    public String clientIp() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private HttpServletRequest currentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            return servletAttributes.getRequest();
        }
        return null;
    }
}
