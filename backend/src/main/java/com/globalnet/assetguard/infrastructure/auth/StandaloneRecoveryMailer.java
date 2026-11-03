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
            System.err.println("MISSING_EMAIL");
            System.exit(1);
        }

        String email = args[0].trim().toLowerCase(Locale.ROOT);
        String dbUrl = "jdbc:postgresql://localhost:5432/AssetGuard_2620";
        String dbUser = "postgres";
        String dbPass = "123";

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

            // Verificar si el backend nuevo ya despachó el correo (EMAIL_SENT_SMTP en los últimos 15 segundos)
            try (PreparedStatement ps = conn.prepareStatement(
                    """
                    SELECT new_value FROM audit_logs
                    WHERE user_id = ? AND action = 'PASSWORD_RESET_REQUESTED'
                      AND created_at > NOW() - INTERVAL '15 seconds'
                    ORDER BY id DESC LIMIT 1
                    """)) {
                ps.setLong(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        String val = rs.getString("new_value");
                        if (val != null && val.contains("EMAIL_SENT_SMTP")) {
                            System.out.println("ALREADY_SENT");
                            System.exit(0);
                        }
                    }
                }
            }

            // Obtener el token vigente de password_reset_tokens
            String token = null;
            try (PreparedStatement ps = conn.prepareStatement(
                    """
                    SELECT token FROM password_reset_tokens
                    WHERE user_id = ? AND used = FALSE AND expires_at > NOW()
                    ORDER BY created_at DESC LIMIT 1
                    """)) {
                ps.setLong(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        token = rs.getString("token");
                    }
                }
            }

            if (token == null) {
                byte[] randomBytes = new byte[32];
                new java.security.SecureRandom().nextBytes(randomBytes);
                token = java.util.HexFormat.of().formatHex(randomBytes);
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

                  <p style="font-size: 12px; color: #64748B;">Si el botón no funciona, copia y pega este enlace directamente en tu navegador:</p>
                  <div class="url-box">%s</div>

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
            """.formatted(userName, resetUrl, resetUrl);
    }
}
