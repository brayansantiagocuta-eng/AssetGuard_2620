package com.globalnet.assetguard.infrastructure.auth;

public record AuthenticatedUser(
        long id,
        String role,
        String fullName,
        String email,
        String status) {
}
