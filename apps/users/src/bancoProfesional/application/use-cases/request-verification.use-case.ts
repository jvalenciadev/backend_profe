import { ForbiddenException, Injectable } from '@nestjs/common';
import { MailService } from '@app/common';
import { PrismaService } from '@app/database';
import * as crypto from 'crypto';

@Injectable()
export class RequestVerificationUseCase {
  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) { }

  async execute(email: string) {
    const normalizedEmail = String(email).trim().toLowerCase();

    // Comprobar si el correo ya existe en usuarios activos
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

    // Eliminar códigos anteriores del mismo correo y persistir el nuevo en BD
    await this.prisma.verificacion_codigo.deleteMany({
      where: { correo: normalizedEmail },
    });
    await this.prisma.verificacion_codigo.create({
      data: { correo: normalizedEmail, codigo: code, expires },
    });

    await this.mailService.sendVerificationCodeEmail(
      normalizedEmail,
      code,
      'Postulante',
    );
    return { message: 'Código enviado' };
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const normalizedEmail = String(email).trim().toLowerCase();
    const record = await this.prisma.verificacion_codigo.findFirst({
      where: { correo: normalizedEmail },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !record ||
      String(record.codigo) !== String(code).trim() ||
      record.expires < new Date()
    ) {
      return false;
    }

    // Consumir el código (borrar tras uso exitoso)
    await this.prisma.verificacion_codigo.deleteMany({
      where: { correo: normalizedEmail },
    });
    return true;
  }
}
