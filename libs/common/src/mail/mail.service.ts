import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
    ) { }

    async sendPasswordResetEmail(email: string, token: string, name: string) {
        // En un entorno real, esto sería una URL a tu frontend
        // Ejemplo: https://tu-app.com/reset-password?token=XYZ
        const resetUrl = `http://localhost:5415/auth/reset-password?token=${token}`;

        try {
            await this.mailerService.sendMail({
                to: email,
                subject: '\uD83D\uDD11 Recuperaci\u00F3n de Contrase\u00F1a - PROFE',
                context: {
                    name,
                    resetUrl,
                    token,
                },
                // Si no usamos plantillas (EJS/Handlebars), podemos usar 'html' directamente:
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #2c3e50; text-align: center;">Recuperaci&oacute;n de Contrase&ntilde;a</h2>
                        <p>Hola <strong>${name}</strong>,</p>
                        <p>Has solicitado restablecer tu contrase&ntilde;a en el sistema <strong>PROFE</strong>. Utiliza el siguiente c&oacute;digo para completar el proceso:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #3498db; border-radius: 5px; margin: 20px 0;">
                            ${token}
                        </div>
                        <p>O haz clic en el siguiente bot&oacute;n para ir directamente:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contrase&ntilde;a</a>
                        </div>
                        <p style="color: #7f8c8d; font-size: 12px;">Si no solicitaste este cambio, puedes ignorar este correo con seguridad. Este enlace y c&oacute;digo expirar&aacute;n en 1 hora.</p>
                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
                        <p style="text-align: center; color: #bdc3c7; font-size: 10px;">&copy; 2026 PROFE - Ministerio de Educaci&oacute;n de Bolivia</p>
                    </div>
                `,
            });
            this.logger.log(`Email de recuperación enviado a: ${email}`);
            return true;
        } catch (error) {
            this.logger.error(`Error enviando email a ${email}:`, error);
            return false;
        }
    }
}
