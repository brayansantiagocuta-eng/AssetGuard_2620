package com.globalnet.assetguard.application;

import com.globalnet.assetguard.domain.RoleType;
import com.globalnet.assetguard.domain.UserStatus;
import com.globalnet.assetguard.infrastructure.auth.AuthenticatedUser;
import com.globalnet.assetguard.infrastructure.auth.PasswordHasher;
import com.globalnet.assetguard.infrastructure.auth.UserRepository;
import com.globalnet.assetguard.infrastructure.graphql.ApiException;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlInputs;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Gestion de cuentas (RF-001 / HU-001, HU-016). */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final AuditService auditService;

    public UserService(
            UserRepository userRepository,
            PasswordHasher passwordHasher,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.auditService = auditService;
    }

    public GraphQlModels.Page<GraphQlModels.User> findPage(
            RoleType role,
            UserStatus status,
            PageQuery query) {
        return userRepository.findPage(
                role == null ? null : role.name(),
                status == null ? null : status.name(),
                query);
    }

    public GraphQlModels.User findById(long id) {
        return userRepository.findViewById(id)
                .orElseThrow(() -> ApiException.notFound("No se encontró el usuario."));
    }

    @Transactional
    public GraphQlModels.User create(GraphQlInputs.CreateUserInput input) {
        if (input == null) {
            throw ApiException.badRequest("Los datos del usuario son obligatorios.");
        }
        String fullName = required(input.fullName(), "El nombre completo es obligatorio.");
        String email = required(input.email(), "El correo es obligatorio.").toLowerCase(Locale.ROOT);
        String password = required(input.password(), "La contraseña es obligatoria.");
        if (!email.contains("@") || email.startsWith("@") || email.endsWith("@")) {
            throw ApiException.badRequest("El correo no es válido.");
        }
        if (password.length() < 6 || password.length() > 20) {
            throw ApiException.badRequest("La contraseña debe tener entre 6 y 20 caracteres.");
        }
        if (input.role() == null) {
            throw ApiException.badRequest("El rol es obligatorio.");
        }
        if (userRepository.emailExists(email)) {
            throw ApiException.conflict("El correo ya está registrado.");
        }

        long id = userRepository.create(fullName, email, passwordHasher.hashBcrypt(password), input.role().name());
        auditService.record("CREATE_USER", "users", id, null, "{\"email\":\"" + email + "\"}");
        return findById(id);
    }

    @Transactional
    public GraphQlModels.User update(long id, GraphQlInputs.UpdateUserInput input) {
        if (input == null) {
            throw ApiException.badRequest("Los datos del usuario son obligatorios.");
        }
        AuthenticatedUser current = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("No se encontró el usuario."));

        String newRole = input.role() == null ? current.role() : input.role().name();
        String newStatus = input.status() == null ? current.status() : input.status().name();
        boolean removesActiveAdministrator = "ADMIN".equals(current.role())
                && "ACTIVE".equals(current.status())
                && (!"ADMIN".equals(newRole) || !"ACTIVE".equals(newStatus));
        if (removesActiveAdministrator && userRepository.countActiveAdministrators() <= 1) {
            throw ApiException.conflict("Debe mantenerse al menos un administrador activo.");
        }

        String fullName = input.fullName() == null
                ? null
                : required(input.fullName(), "El nombre completo no puede estar vacío.");
        userRepository.update(
                id,
                fullName,
                input.role() == null ? null : newRole,
                input.status() == null ? null : newStatus);
        auditService.record(
                "UPDATE_USER",
                "users",
                id,
                "{\"role\":\"" + current.role() + "\",\"status\":\"" + current.status() + "\"}",
                "{\"role\":\"" + newRole + "\",\"status\":\"" + newStatus + "\"}");
        return findById(id);
    }

    @Transactional
    public GraphQlModels.User resetPassword(long id, String newPassword) {
        AuthenticatedUser current = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("No se encontró el usuario."));
        String password = required(newPassword, "La nueva contraseña es obligatoria.");
        if (password.length() < 6 || password.length() > 20) {
            throw ApiException.badRequest("La contraseña debe tener entre 6 y 20 caracteres.");
        }
        if (!password.matches("^[a-zA-Z0-9$!#%&]+$")) {
            throw ApiException.badRequest("La contraseña solo permite letras, números y signos ($!#%&).");
        }
        userRepository.updatePassword(id, passwordHasher.hashBcrypt(password));
        auditService.record(
                "PASSWORD_RESET_BY_ADMIN",
                "users",
                id,
                null,
                "{\"email\":\"" + current.email() + "\",\"status\":\"COMPLETED\"}");
        return findById(id);
    }

    private static String required(String value, String message) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(message);
        }
        return value.trim();
    }
}
