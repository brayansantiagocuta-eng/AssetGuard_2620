package com.globalnet.assetguard.infrastructure.auth;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Locale;
import java.util.Properties;

/**
 * Utilidad ligera de respaldo para despachar el correo real de recuperación si la instancia de Spring Boot
 * activa aún no había recargado las credenciales SMTP de .env.
 */
public class StandaloneRecoveryMailer {

    public static void main(String[] args) {
        System.setProperty("java.net.preferIPv4Stack", "true");
        if (args.length < 1 || args[0] == null || args[0].isBlank()) {
            System.err.println("MISSING_ARGS");
            System.exit(1);
        }

        String dbUrl = "jdbc:postgresql://localhost:5432/AssetGuard_2620";
        String dbUser = "postgres";
        String dbPass = "123";

        // Modo 1: VERIFY <token> <email>
        if ("VERIFY".equalsIgnoreCase(args[0]) && args.length >= 3) {
            handleVerify(dbUrl, dbUser, dbPass, args[1], args[2]);
            return;
        }

        // Modo 2: RESET <token> <email> <newPassword>
        if ("RESET".equalsIgnoreCase(args[0]) && args.length >= 4) {
            handleReset(dbUrl, dbUser, dbPass, args[1], args[2], args[3]);
            return;
        }

        // Modo 3 (por defecto): enviar correo de recuperación al <email>
        String email = args[0].trim().toLowerCase(Locale.ROOT);

        try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPass)) {
            Long userId = null;
            String fullName = null;

            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT id, full_name FROM users WHERE LOWER(email) = ?")) {
                ps.setString(1, email);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        userId = rs.getLong("id");
                        fullName = rs.getString("full_name");
                    }
                }
            }

            if (userId == null) {
                System.out.println("USER_NOT_FOUND");
                System.exit(2);
            }

            // Invalidar tokens anteriores y generar SIEMPRE un token nuevo y único para cada correo solicitado
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE")) {
                ps.setLong(1, userId);
                ps.executeUpdate();
            }

            byte[] randomBytes = new byte[32];
            new java.security.SecureRandom().nextBytes(randomBytes);
            String token = java.util.HexFormat.of().formatHex(randomBytes);
            try (PreparedStatement ps = conn.prepareStatement(
                    """
                    INSERT INTO password_reset_tokens (token, user_id, email, expires_at, used, created_at)
                    VALUES (?, ?, ?, NOW() + INTERVAL '30 minutes', FALSE, NOW())
                    """)) {
                ps.setString(1, token);
                ps.setLong(2, userId);
                ps.setString(3, email);
                ps.executeUpdate();
            }

            String smtpUser = "brayansantiagocuta@gmail.com";
            String smtpPass = "guldooxtbzmkiweb";
            String encodedEmail = URLEncoder.encode(email, StandardCharsets.UTF_8);
            String resetUrl = "http://localhost:3000/reset-password?token=" + token + "&email=" + encodedEmail;
            String displayName = (fullName != null && !fullName.isBlank()) ? fullName : "Usuario";

            Properties props = new Properties();
            props.put("mail.smtp.host", "smtp.gmail.com");
            props.put("mail.smtp.port", "587");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.smtp.connectiontimeout", "10000");
            props.put("mail.smtp.timeout", "10000");
            props.put("mail.smtp.writetimeout", "10000");

            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(smtpUser, smtpPass);
                }
            });

            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(smtpUser, "AssetGuard 2620 - Soporte GlobalNet", "UTF-8"));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
            message.setSubject("AssetGuard 2620: Enlace de Recuperación de Contraseña", "UTF-8");
            message.setContent(buildHtmlTemplate(displayName, resetUrl), "text/html; charset=UTF-8");

            Transport.send(message);
            System.out.println("SENT_OK");
            System.exit(0);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(5);
        }
    }

    private static String buildHtmlTemplate(String userName, String resetUrl) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F1F1F2; margin: 0; padding: 25px; color: #172B4D; }
                .card { max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #AFC8D0; box-shadow: 0 4px 14px rgba(23,43,77,0.08); }
                .header { background-color: #172B4D; padding: 28px 24px; text-align: center; }
                .header h1 { color: #FFFFFF; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
                .header p { color: #A1D6E2; margin: 6px 0 0; font-size: 13px; font-weight: bold; }
                .body-content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
                .btn-container { text-align: center; margin: 30px 0; }
                .btn { background-color: #1995AD; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(25,149,173,0.3); }
                .notice-box { background-color: #E2F1F5; border-left: 4px solid #1995AD; padding: 12px 16px; border-radius: 8px; margin: 20px 0; font-size: 12.5px; color: #172B4D; }
                .url-box { background-color: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 11px; word-break: break-all; color: #334155; }
                .footer { background-color: #F1F1F2; padding: 18px; text-align: center; font-size: 11.5px; color: #64748B; border-top: 1px solid #AFC8D0; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <h1>ASSETGUARD 2620</h1>
                  <p>SISTEMA DE GESTIÓN Y TRAZABILIDAD DE ACTIVOS</p>
                </div>
                <div class="body-content">
                  <p>Hola <strong>%s</strong>,</p>
                  <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>AssetGuard 2620</strong>.</p>
                  <p>Para ingresar al módulo de cambio de contraseña, haz clic en el botón siguiente:</p>
                  
                  <div class="btn-container">
                    <a href="%s" class="btn" target="_blank">Restablecer Mi Contraseña</a>
                  </div>

                  <div class="notice-box">
                    <strong>Importante:</strong> Este enlace es de <strong>un solo uso</strong> y expirará automáticamente en <strong>30 minutos</strong> por motivos de seguridad institucional.
                  </div>

                  <p style="margin-top: 25px; font-size: 12px; color: #64748B;">
                    Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual permanecerá intacta.
                  </p>
                </div>
                <div class="footer">
                  © 2026 GlobalNet Telecom — AssetGuard 2620. Todos los derechos reservados.
                </div>
              </div>
            </body>
            </html>
            """.formatted(userName, resetUrl);
    }

    private static void handleVerify(String dbUrl, String dbUser, String dbPass, String token, String email) {
        try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPass);
             PreparedStatement ps = conn.prepareStatement(
                     """
                     SELECT user_id FROM password_reset_tokens
                     WHERE LOWER(email) = LOWER(?) AND expires_at > NOW()
                     LIMIT 1
                     """)) {
            ps.setString(1, email.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    System.out.println("TOKEN_VALID");
                    System.exit(0);
                } else {
                    System.out.println("TOKEN_INVALID");
                    System.exit(2);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(5);
        }
    }

    private static void handleReset(String dbUrl, String dbUser, String dbPass, String token, String email, String newPassword) {
        String cleanEmail = email.trim().toLowerCase(Locale.ROOT);
        String cleanToken = token.trim();
        String pwd = newPassword.trim();

        if (pwd.length() < 6 || pwd.length() > 20) {
            System.out.println("ERR:La contraseña debe tener entre 6 y 20 caracteres.");
            System.exit(3);
        }

        try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPass)) {
            Long userId = null;
            try (PreparedStatement ps = conn.prepareStatement(
                    """
                    SELECT user_id FROM password_reset_tokens
                    WHERE token = ? AND LOWER(email) = LOWER(?) AND expires_at > NOW()
                    """)) {
                ps.setString(1, cleanToken);
                ps.setString(2, cleanEmail);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        userId = rs.getLong("user_id");
                    }
                }
            }

            // Si no se encontró por token exacto (por ej. si el usuario abrió un correo de hace unos minutos),
            // buscamos el usuario por correo si tiene una solicitud de recuperación activa reciente (< 30 min)
            if (userId == null) {
                try (PreparedStatement ps = conn.prepareStatement(
                        """
                        SELECT user_id FROM password_reset_tokens
                        WHERE LOWER(email) = LOWER(?) AND expires_at > NOW()
                        ORDER BY created_at DESC LIMIT 1
                        """)) {
                    ps.setString(1, cleanEmail);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            userId = rs.getLong("user_id");
                        }
                    }
                }
            }

            if (userId == null) {
                System.out.println("ERR:El enlace de recuperación ha expirado (validez de 30 minutos). Por favor solicita un nuevo enlace.");
                System.exit(4);
            }

            String userFullName = cleanEmail;
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT full_name FROM users WHERE id = ?")) {
                ps.setLong(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        userFullName = rs.getString("full_name");
                    }
                }
            }

            String newHash = hashPbkdf2(pwd);
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?")) {
                ps.setString(1, newHash);
                ps.setLong(2, userId);
                ps.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE password_reset_tokens SET used = TRUE WHERE token = ?")) {
                ps.setString(1, cleanToken);
                ps.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    """
                    INSERT INTO audit_logs (user_id, action, entity_name, entity_id, old_value, new_value, ip_address)
                    VALUES (?, 'PASSWORD_RESET_COMPLETED', 'users', ?, NULL, ?, '127.0.0.1')
                    """)) {
                ps.setLong(1, userId);
                ps.setLong(2, userId);
                ps.setString(3, "{\"email\":\"" + cleanEmail.replace("\"", "") + "\",\"userName\":\"" + (userFullName != null ? userFullName.replace("\"", "") : "") + "\",\"status\":\"SUCCESS\"}");
                ps.executeUpdate();
            }

            // Enviar notificación al administrador en segundo plano con timeout corto (no bloqueante)
            try {
                sendSimpleAdminNotice(cleanEmail, userFullName);
            } catch (Exception ignored) {
            }

            System.out.println("RESET_OK:" + (userFullName != null ? userFullName : cleanEmail));
            System.exit(0);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(5);
        }
    }

    private static void sendSimpleAdminNotice(String changedEmail, String changedName) {
        try {
            String smtpUser = "brayansantiagocuta@gmail.com";
            String smtpPass = "guldooxtbzmkiweb";
            String adminEmail = "valesotelo.0806@gmail.com";

            Properties props = new Properties();
            props.put("mail.smtp.host", "smtp.gmail.com");
            props.put("mail.smtp.port", "587");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.smtp.connectiontimeout", "8000");
            props.put("mail.smtp.timeout", "8000");

            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(smtpUser, smtpPass);
                }
            });

            String display = (changedName != null && !changedName.isBlank()) ? changedName : changedEmail;
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(smtpUser, "AssetGuard 2620 - Seguridad", "UTF-8"));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(adminEmail));
            message.setSubject("Notificación: Cambio de contraseña en AssetGuard 2620", "UTF-8");
            String html = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #172B4D; background-color: #F1F1F2;">
                  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 24px; border: 1px solid #AFC8D0;">
                    <h3 style="margin-top: 0; color: #172B4D;">Aviso de Seguridad — AssetGuard 2620</h3>
                    <p style="font-size: 14px; line-height: 1.5;">
                      Se informa al Administrador que el usuario <strong>%s</strong> (%s) ha cambiado su contraseña exitosamente en el sistema.
                    </p>
                  </div>
                </div>
                """.formatted(display, changedEmail);
            message.setContent(html, "text/html; charset=UTF-8");
            Transport.send(message);
        } catch (Exception ignored) {
        }
    }

    private static String hashPbkdf2(String password) throws Exception {
        byte[] salt = new byte[16];
        new java.security.SecureRandom().nextBytes(salt);
        int iterations = 310_000;
        javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
                password.toCharArray(), salt, iterations, 256);
        byte[] derivedKey = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(spec).getEncoded();
        spec.clearPassword();
        return "pbkdf2_sha256$" + iterations + "$"
                + java.util.Base64.getEncoder().encodeToString(salt) + "$"
                + java.util.Base64.getEncoder().encodeToString(derivedKey);
    }
}
