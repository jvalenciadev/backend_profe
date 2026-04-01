import { ForbiddenException, Injectable } from '@nestjs/common';
import { MailService } from '@app/common';
import { PrismaService } from '@app/database';
import * as crypto from 'crypto';

@Injectable()
export class RequestVerificationUseCase {
  private verificationCodes = new Map<
    string,
    { code: string; expires: Date }
  >();

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(email: string) {
    const normalizedEmail = String(email).trim().toLowerCase();

    // Comprobar si el correo ya existe en admins
    const existing = await this.prisma.user.findUnique({
      where: { correo: normalizedEmail },
    });

    if (existing) {
      throw new ForbiddenException(
        'Este correo electrónico ya se encuentra registrado por un usuario activo en el sistema.',
      );
    }
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    this.verificationCodes.set(normalizedEmail, { code, expires });

    await this.mailService.sendVerificationCodeEmail(
      normalizedEmail,
      code,
      'Postulante',
    );
    return { message: 'Código enviado' };
  }

  verifyCode(email: string, code: string): boolean {
    const normalizedEmail = String(email).trim().toLowerCase();
    const verification = this.verificationCodes.get(normalizedEmail);

    if (
      !verification ||
      String(verification.code) !== String(code).trim() ||
      verification.expires < new Date()
    ) {
      return false;
    }

    this.verificationCodes.delete(normalizedEmail);
    return true;
  }
}
