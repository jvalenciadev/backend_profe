import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía correos de forma masiva en bloques (chunks) para evitar bloqueos
   * del servidor SMTP y manejar grandes volúmenes de destinatarios.
   */
  async sendComunicadoEmailChunks(
    emails: string[],
    titulo: string,
    contenido: string,
    imagen?: string,
  ) {
    const chunkSize = 40; // Tamaño de bloque seguro
    const waitBetweenChunks = 3000; // 3 segundos entre bloques para evitar rate limits
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:5415';

    this.logger.log(
      `[MailService] Iniciando envío masivo: "${titulo}" a ${emails.length} destinatarios.`,
    );

    const imageUrl = imagen
      ? imagen.startsWith('http')
        ? imagen
        : `${frontendUrl}/${imagen}`
      : null;

    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      try {
        await this.mailerService.sendMail({
          bcc: chunk, // BCC para privacidad de los destinatarios
          subject: `📢 AVISO PROFE: ${titulo}`,
          html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                  <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="color: #1a365d; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Comunicado Institucional</h2>
                    <div style="width: 50px; height: 3px; background-color: #3182ce; margin: 10px auto;"></div>
                  </div>

                  ${
                    imageUrl
                      ? `
                  <div style="margin-bottom: 25px; border-radius: 12px; overflow: hidden; text-align: center;">
                    <img src="${imageUrl}" alt="${titulo}" style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;" />
                  </div>
                  `
                      : ''
                  }
                  
                  <h3 style="color: #2b6cb0; font-size: 18px; margin-top: 0;">${titulo}</h3>
                  
                  <div style="padding: 20px; margin: 20px 0; background-color: #f7fafc; border-left: 4px solid #3182ce; line-height: 1.7; color: #4a5568; font-size: 15px;">
                      ${contenido}
                  </div>

                  <p style="font-size: 13px; color: #718096; margin-top: 30px;">
                    Este es un aviso automático enviado a todo el personal administrativo estratégico. No es necesario responder a este correo.
                  </p>
                  
                  <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;">
                  
                  <div style="text-align: center;">
                    <p style="color: #a0aec0; font-size: 11px; margin: 0;">&copy; 2026 PROFE - Programa de Formación Especializada</p>
                    <p style="color: #a0aec0; font-size: 11px; margin: 5px 0 0 0;">Ministerio de Educación de Bolivia</p>
                  </div>
              </div>
          `,
        });

        this.logger.log(
          `[MailService] Chunk enviado exitosamente (${i + chunk.length}/${emails.length})`,
        );

        // Si hay más bloques (chunks), esperamos un poco
        if (i + chunkSize < emails.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, waitBetweenChunks),
          );
        }
      } catch (error) {
        this.logger.error(
          `[MailService] Error enviando chunk iniciado en índice ${i}:`,
          error,
        );
      }
    }
    this.logger.log(`[MailService] Envío masivo finalizado.`);
  }

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

  async sendVerificationCodeEmail(email: string, token: string, name: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '✉️ Código de Verificación - PROFE',
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #2c3e50; text-align: center;">Verificación de Correo</h2>
                        <p>Hola <strong>${name}</strong>,</p>
                        <p>Has solicitado un código de verificación en el sistema <strong>PROFE</strong>.</p>
                        <p>Ingresa el siguiente código de 6 dígitos en la pantalla para continuar con tu trámite o registro:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #1474a6; border-radius: 12px; margin: 25px 0; border: 1px solid #e0e0e0;">
                            ${token}
                        </div>
                        <p style="color: #7f8c8d; font-size: 11px; text-align: center;">Si no solicitaste este código, puedes ignorar este correo de forma segura. Este código expirará pronto.</p>
                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;">
                        <p style="text-align: center; color: #bdc3c7; font-size: 10px;">&copy; 2026 PROFE - Ministerio de Educación de Bolivia</p>
                    </div>
                `,
      });
      this.logger.log(`Email de verificación enviado a: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error enviando código de verificación a ${email}:`,
        error,
      );
      return false;
    }
  }

  async sendPasswordResetSuccess(
    email: string,
    name: string,
    password: string,
  ) {
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
      this.logger.error(
        `Error enviando email de éxito de reset a ${email}:`,
        error,
      );
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
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
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

  async sendAprobacionPostulanteEmail(email: string, name: string) {
    try {
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const logoUrl = `${frontendUrl}/logo-principal.png`;

      await this.mailerService.sendMail({
        to: email,
        subject:
          '¡Felicidades! Su postulación ha sido aprobada - Programa PROFE',
        html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="background-color: #10b981; padding: 25px; text-align: center;">
                            <img src="${logoUrl}" alt="Programa PROFE" style="max-height: 80px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.2)); margin-bottom: 5px;" onerror="this.outerHTML='<h1 style=\\'color: white; margin: 0; font-size: 28px; letter-spacing: 2px;\\'>PROFE</h1>'" />
                            <p style="color: #ecfdf5; margin: 0; font-size: 14px; letter-spacing: 1px;">Programa de Formación Especializada</p>
                        </div>

                        <div style="padding: 35px 30px; background-color: #ffffff;">
                            <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">Estimado(a) <strong>${name}</strong>,</p>
                            
                            <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
                                Es un placer para nosotros informarle que, tras la revisión de su perfil y postulación al programa <strong>PROFE</strong>, su solicitud ha sido **APROBADA**.
                            </p>

                            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px 20px; margin: 25px 0;">
                                <p style="color: #065f46; font-size: 15px; line-height: 1.6; margin: 0;">
                                    ¡Bienvenido(a) al Banco Profesional de PROFE! Su perfil ahora se encuentra activo en nuestro sistema.
                                </p>
                            </div>

                            <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
                                En los próximos días, nos pondremos en contacto con usted a través de su número de celular para coordinar los siguientes pasos y brindarle más detalles sobre su participación.
                            </p>

                            <p style="color: #475569; font-size: 15px; margin-top: 35px; margin-bottom: 5px;">Atentamente,</p>
                            <p style="color: #0f172a; font-size: 16px; font-weight: bold; margin: 0;">Coordinación del Programa PROFE</p>
                        </div>

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
      this.logger.log(`Email de aprobación enviado a: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error enviando email de aprobación a ${email}:`,
        error,
      );
      return false;
    }
  }

  async sendInscripcionConfirmation(
    email: string,
    name: string,
    programa: string,
    sede: string,
  ) {
    try {
      const loginUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:5415'}/login`;

      await this.mailerService.sendMail({
        to: email,
        subject: '📝 Confirmación de Inscripción - PROFE',
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="color: #1474a6;">¡Inscripción Recibida!</h2>
                            <p style="color: #7f8c8d;">Sistema PROFE</p>
                        </div>
                        <p>Hola <strong>${name}</strong>,</p>
                        <p>Tu solicitud de inscripción ha sido registrada correctamente en el sistema.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                            <p style="margin: 0; color: #2c3e50;"><strong>Programa:</strong> ${programa}</p>
                            <p style="margin: 10px 0 0 0; color: #2c3e50;"><strong>Sede:</strong> ${sede}</p>
                            <p style="margin: 10px 0 0 0; color: #2c3e50;"><strong>Estado:</strong> En revisión (Pendiente)</p>
                        </div>

                        <p>Una vez que el administrador verifique tu comprobante de pago, recibirás un correo de aprobación y podrás acceder a tu aula virtual.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${loginUrl}" style="background-color: #1474a6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Acceder a mi Panel</a>
                        </div>

                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;">
                        <p style="text-align: center; color: #bdc3c7; font-size: 10px;">&copy; 2026 PROFE - Ministerio de Educación de Bolivia</p>
                    </div>
                `,
      });
      this.logger.log(
        `Email de confirmación de inscripción enviado a: ${email}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error enviando confirmación a ${email}:`, error);
      return false;
    }
  }
}
