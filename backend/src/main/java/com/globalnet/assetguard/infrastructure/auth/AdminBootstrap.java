package com.globalnet.assetguard.infrastructure.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdminBootstrap.class);

    private final Environment environment;
    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;

    public AdminBootstrap(
            Environment environment,
            UserRepository userRepository,
            PasswordHasher passwordHasher) {
        this.environment = environment;
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = environment.getProperty("BOOTSTRAP_ADMIN_EMAIL");
        String password = environment.getProperty("BOOTSTRAP_ADMIN_PASSWORD");
        String fullName = environment.getProperty("BOOTSTRAP_ADMIN_NAME", "Administrador AssetGuard");

        if ((email == null) != (password == null)) {
            throw new IllegalStateException(
                    "Configure BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD together.");
        }
        if (email == null) {
            LOGGER.warn("No bootstrap administrator configured. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.");
            return;
        }
        if (email.isBlank() || fullName.isBlank()) {
            throw new IllegalStateException(
                    "The bootstrap administrator requires BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_NAME.");
        }
        String normalizedEmail = email.trim().toLowerCase(java.util.Locale.ROOT);

        // La cuenta ya existe: no se valida ni se toca la contrasena (evita
        // sobrescribir credenciales en cada arranque).
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            LOGGER.info(
                    "Bootstrap administrator {} already exists; its password and status were not modified.",
                    normalizedEmail);
            return;
        }

        if (password.length() < 12 || password.length() > 20) {
            throw new IllegalStateException(
                    "Creating the bootstrap administrator requires a password between 12 and 20 characters.");
        }

        var created = userRepository.createBootstrapAdministratorIfMissing(
                fullName.trim(),
                normalizedEmail,
                passwordHasher.hash(password));
        if (created.isPresent()) {
            LOGGER.info("Bootstrap administrator created with id {}.", created.get());
        } else {
            LOGGER.info("Bootstrap administrator {} already exists; nothing was changed.", normalizedEmail);
        }
    }
}
