package com.globalnet.assetguard.infrastructure.auth;

import jakarta.mail.internet.MimeMessage;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromEmail;
    private final String resetBaseUrl;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${assetguard.mail.from:soporte.assetguard@globalnet.com}") String fromEmail,
            @Value("${assetguard.app.reset-url:http://localhost:3000/reset-password}") String resetBaseUrl) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
        this.resetBaseUrl = resetBaseUrl;
    }

    /**
     * Envía un correo electrónico real con formato HTML corporativo para la recuperación de contraseña.
     */
    public boolean sendPasswordResetEmail(String toEmail, String recipientName, String token) {
        String encodedEmail = URLEncoder.encode(toEmail, StandardCharsets.UTF_8);
        String resetUrl = resetBaseUrl + "?token=" + token + "&email=" + encodedEmail;

        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Usuario";

        log.info("Iniciando envío de correo de recuperación a {} con URL: {}", toEmail, resetUrl);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "AssetGuard 2620 - Soporte GlobalNet");
            helper.setTo(toEmail);
            helper.setSubject("AssetGuard 2620: Enlace de Recuperación de Contraseña");

            String htmlBody = buildHtmlTemplate(displayName, resetUrl);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Correo de recuperación enviado exitosamente a {}", toEmail);
            return true;
        } catch (Exception ex) {
            log.error("Error al enviar correo SMTP a {}: {}. Enlace generado: {}", toEmail, ex.getMessage(), resetUrl);
            // Si el servidor SMTP no está accesible localmente, informamos en log para no romper la experiencia
            return false;
        }
    }

    private String buildHtmlTemplate(String userName, String resetUrl) {
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
