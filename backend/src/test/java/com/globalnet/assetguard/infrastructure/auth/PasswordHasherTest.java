package com.globalnet.assetguard.infrastructure.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PasswordHasherTest {

    private final PasswordHasher passwordHasher = new PasswordHasher();

    @Test
    void hashesPasswordsWithUniqueSaltsAndVerifiesTheOriginal() {
        String firstHash = passwordHasher.hash("Example-Strong-42");
        String secondHash = passwordHasher.hash("Example-Strong-42");

        assertNotEquals(firstHash, secondHash);
        assertTrue(passwordHasher.matches("Example-Strong-42", firstHash));
        assertFalse(passwordHasher.matches("incorrect-password", firstHash));
    }

    @Test
    void rejectsLegacyDemoHashes() {
        assertFalse(passwordHasher.matches(
                "Password123!",
                "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR0e0v11gX7Pq/h6Kx7v0F1i0vYiq"));
    }

    @Test
    void verifiesExistingBcryptUserPasswords() {
        String bcryptHash = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
                .encode("Existing-Password-42");

        assertTrue(passwordHasher.matches("Existing-Password-42", bcryptHash));
        assertFalse(passwordHasher.matches("incorrect-password", bcryptHash));
    }
}
