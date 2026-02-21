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
        const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard/reset-password?token=${token}`;

        try {
            await this.mailerService.sendMail({
                to: email,
                subject: '🔑 Recuperación de Contraseña - PROFE',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #2c3e50; text-align: center;">Recuperación de Contraseña</h2>
                        <p>Hola <strong>${name}</strong>,</p>
                        <p>Has solicitado restablecer tu contraseña en el sistema <strong>PROFE</strong>. Utiliza el siguiente código para completar el proceso:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #3498db; border-radius: 5px; margin: 20px 0;">
                            ${token}
                        </div>
                        <p style="color: #7f8c8d; font-size: 12px;">Si no solicitaste este cambio, puedes ignorar este correo con seguridad. Este código expirará en 24 horas.</p>
                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
                        <p style="text-align: center; color: #bdc3c7; font-size: 10px;">&copy; 2026 PROFE - Ministerio de Educación de Bolivia</p>
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

    async sendWelcomeEmail(email: string, name: string, username: string) {
        try {
            await this.mailerService.sendMail({
                to: email,
                subject: '🚀 Bienvenido al Sistema PROFE',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #2c3e50; text-align: center;">¡Bienvenido a PROFE!</h2>
                        <p>Hola <strong>${name}</strong>,</p>
                        <p>Se ha creado una cuenta administrativa para ti en el sistema <strong>PROFE</strong>.</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Usuario:</strong> ${username}</p>
                            <p style="margin: 10px 0 0 0;"><strong>Contraseña temporal:</strong> password123</p>
                        </div>
                        <p>Por razones de seguridad, se te pedirá cambiar tu contraseña al iniciar sesión por primera vez.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/login" style="background-color: #1474a6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acceder al Sistema</a>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
                        <p style="text-align: center; color: #bdc3c7; font-size: 10px;">&copy; 2026 PROFE - Ministerio de Educación de Bolivia</p>
                    </div>
                `,
            });
            return true;
        } catch (error) {
            this.logger.error(`Error enviando bienvenida a ${email}:`, error);
            return false;
        }
    }
}
