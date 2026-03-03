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
    const loginUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/login`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '🔑 Recuperación de Contraseña - PROFE',
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #2c3e50; text-align: center;">Recuperación de Contraseña</h2>
                        <p>Hola <strong>${name}</strong>,</p>
                        <p>Has solicitado restablecer tu contraseña en el sistema <strong>PROFE</strong>.</p>
                        <p>Ingresa el siguiente código de 6 dígitos en la pantalla de recuperación para continuar:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #1474a6; border-radius: 12px; margin: 25px 0; border: 1px solid #e0e0e0;">
                            ${token}
                        </div>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${loginUrl}" style="background-color: #1474a6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ir al Inicio de Sesión</a>
                        </p>
                        <p style="color: #7f8c8d; font-size: 11px; text-align: center;">Si no solicitaste este cambio, puedes ignorar este correo con seguridad. Este código expirará en 1 hora.</p>
                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;">
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

  async sendPasswordResetSuccess(email: string, name: string, password: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '🔐 Contraseña Reseteada - PROFE',
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="color: #2c3e50; margin: 0;">Restablecimiento de Contraseña</h2>
                            <p style="color: #7f8c8d; margin: 5px 0 0 0;">Sistema PROFE</p>
                        </div>
                        
                        <p>Hola <strong>${name}</strong>,</p>
                        <p>Un administrador ha restablecido tu contraseña de acceso al sistema <strong>PROFE</strong>.</p>
                        
                        <div style="background-color: #f0f7ff; border-left: 4px solid #3498db; padding: 20px; margin: 25px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #2980b9; font-weight: bold;">Tus nuevas credenciales son:</p>
                            <p style="margin: 15px 0 0 0; font-size: 18px;">🔑 Contraseña: <code style="background: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold; border: 1px solid #d1e9f9;">${password}</code></p>
                        </div>
                        
                        <p style="color: #e67e22; font-weight: bold; margin-top: 20px;">⚠️ Seguridad:</p>
                        <p>Por motivos de seguridad, el sistema te solicitará <strong>cambiar esta contraseña</strong> obligatoriamente en tu próximo inicio de sesión.</p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/login" 
                               style="background-color: #3498db; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                               Ir al Inicio de Sesión
                            </a>
                        </div>
                        
                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;">
                        <p style="text-align: center; color: #95a5a6; font-size: 11px;">
                            Este es un mensaje automático, por favor no lo respondas.<br>
                            &copy; 2026 PROFE - Ministerio de Educación de Bolivia
                        </p>
                    </div>
                `,
      });
      this.logger.log(`Email de éxito de reset enviado a: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando email de éxito de reset a ${email}:`, error);
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

  async sendBajaPostulanteEmail(email: string, name: string) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const logoUrl = `${frontendUrl}/logo-principal.png`; // Ajustado al nombre real en la carpeta public

      await this.mailerService.sendMail({
        to: email,
        subject: 'Actualización sobre su postulación - Programa PROFE',
        html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        
                        <!-- Cabecera con Logo -->
                        <div style="background-color: #1474a6; padding: 25px; text-align: center;">
                            <img src="${logoUrl}" alt="Programa PROFE" style="max-height: 80px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.2)); margin-bottom: 5px;" onerror="this.outerHTML='<h1 style=\\'color: white; margin: 0; font-size: 28px; letter-spacing: 2px;\\'>PROFE</h1>'" />
                            <p style="color: #e0f2fe; margin: 0; font-size: 14px; letter-spacing: 1px;">Programa de Formación Especializada</p>
                        </div>

                        <!-- Contenido Principal -->
                        <div style="padding: 35px 30px; background-color: #ffffff;">
                            <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">Estimado(a) <strong>${name}</strong>,</p>
                            
                            <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
                                A través de la presente comunicación, deseamos expresarle nuestro más sincero agradecimiento por el interés demostrado y por su valiosa participación en el proceso de postulación al programa <strong>PROFE</strong>.
                            </p>

                            <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 15px 20px; margin: 25px 0;">
                                <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
                                    Le informamos que, tras la revisión y actualización de nuestros registros, se ha procedido a dar de baja su solicitud en nuestra base de datos actual.
                                </p>
                            </div>

                            <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
                                Valoramos profundamente el tiempo, esfuerzo y dedicación que invirtió durante las fases del proceso. Reconocemos su capacidad y profesionalismo, y esperamos sinceramente tener el honor de contar nuevamente con su destacada participación en futuras actividades o proyectos que el Ministerio de Educación promueva.
                            </p>

                            <p style="color: #475569; font-size: 15px; margin-top: 35px; margin-bottom: 5px;">Atentamente,</p>
                            <p style="color: #0f172a; font-size: 16px; font-weight: bold; margin: 0;">Coordinación del Programa PROFE</p>
                        </div>

                        <!-- Pie de página -->
                        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                                Este es un mensaje generado automáticamente de carácter informativo.<br>
                                Por favor, no responda a este correo electrónico.
                            </p>
                            <p style="color: #94a3b8; font-size: 10px; margin: 10px 0 0 0; text-transform: uppercase;">
                                &copy; ${new Date().getFullYear()} PROFE - Ministerio de Educación de Bolivia
                            </p>
                        </div>
                    </div>
                `,
      });
      this.logger.log(`Email de baja enviado a: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando email de baja a ${email}:`, error);
      return false;
    }
  }
}
