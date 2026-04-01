import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/database';
import * as bcrypt from 'bcryptjs';
import { CaslAbilityFactory, MailService } from '@app/common';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private abilityFactory: CaslAbilityFactory,
    private mailService: MailService,
  ) { }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { correo: email },
    });
    if (!user) {
      // Por seguridad, no decimos si el correo existe o no
      return {
        message:
          'Si el correo est\u00E1 registrado, recibir\u00E1 un enlace de recuperaci\u00F3n.',
      };
    }

    // Generar un token numérico de 6 dígitos
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Expira en 1 hora

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    await this.mailService.sendPasswordResetEmail(
      user.correo,
      token,
      user.nombre,
    );

    return {
      message:
        'Si el correo est\u00E1 registrado, recibir\u00E1 un enlace de recuperaci\u00F3n.',
    };
  }

  async resetPassword(token: string, newPass: string) {
    const cleanToken = String(token).trim();
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: cleanToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      console.warn(
        `[AuthService] Password reset failed: Invalid or expired token provided: ${token}`,
      );
      throw new UnauthorizedException('Token inv\u00E1lido o expirado');
    }

    console.log(
      `[AuthService] User found for reset: ${user.username}. Hashing new password.`,
    );
    const hashedPassword = await bcrypt.hash(newPass, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    console.log(
      `[AuthService] Password reset successful for user: ${user.username}`,
    );
    return { message: 'Contrase\u00F1a actualizada exitosamente' };
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { correo: username }],
      },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        sedes: {
          include: { sede: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (isMatch) {
      // Restricción de acceso por estado: solo 'activo' y 'pendiente' pueden ingresar
      const estado = String(user.estado).toLowerCase();
      if (estado !== 'activo' && estado !== 'pendiente') {
        throw new UnauthorizedException(
          `Acceso denegado. Su cuenta se encuentra en estado ${user.estado.toUpperCase()}. Por favor, contacte con el administrador del sistema.`,
        );
      }

      // Restricción de rol administrativo (Bloquear PARTICIPANTE)
      const userRolesNames =
        user.roles?.map((ur: any) => ur.role?.name?.toUpperCase() || '') || [];
      if (
        userRolesNames.includes('PARTICIPANTE') &&
        !userRolesNames.some((r: string) =>
          ['ADMIN', 'SUPER_ADMIN', 'FACILITADOR', 'Técnico', 'Gestor'].some(
            (allowed) => r.includes(allowed.toUpperCase()),
          ),
        )
      ) {
        throw new UnauthorizedException(
          'Acceso denegado. Este portal es de uso administrativo. Los participantes deben ingresar por el Aula Virtual.',
        );
      }

      // Validar expiración de contraseña reseteada (1 día de límite)
      if (
        user.requiresPasswordChange &&
        user.resetPasswordExpires &&
        new Date() > user.resetPasswordExpires
      ) {
        throw new UnauthorizedException(
          'Su contraseña temporal ha expirado (límite de 1 día). Por favor, contacte con el administrador para un nuevo reseteo.',
        );
      }

      // Return user without password
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, tokenDispositivo?: string) {
    if (tokenDispositivo) {
      const existingToken = await this.prisma.token_dispositivo.findFirst({
        where: { token: tokenDispositivo },
      });

      if (!existingToken) {
        await this.prisma.token_dispositivo.create({
          data: {
            token: tokenDispositivo,
            userId: user.id,
            tipo_usuario: user.roles?.map((ur: any) => ur.role?.name).join(',') || '',
          },
        });
      } else if (existingToken.userId !== user.id) {
        await this.prisma.token_dispositivo.update({
          where: { id_token: existingToken.id_token },
          data: { userId: user.id },
        });
      }
    }

    const roles = user.roles?.map((ur: any) => ur.role.name) || [];
    const sedesIds = user.sedes?.map((us: any) => us.sedeId.toString()) || [];

    const payload = {
      username: user.username,
      sub: user.id.toString(),
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      roles: roles,
      sedes: sedesIds,
    };

    // Generar habilidades de CASL
    const ability = await this.abilityFactory.createForUser(user);

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.correo,
        nombre: user.nombre,
        apellidos: user.apellidos,
        imagen: user.imagen,
        cargo: user.cargoStr,
        celular: user.celular,
        genero: user.genero,
        licenciatura: user.licenciatura,
        direccion: user.direccion,
        curriculum: user.curriculum,
        fechaNacimiento: user.fechaNacimiento,
        estadoCivil: user.estadoCivil,
        facebook: user.facebook,
        tiktok: user.tiktok,
        tenant: user.tenant,
        tenantId: user.tenantId,
        roles: roles,
        permissions: ability.rules,
        estado: user.estado,
        sedes: user.sedes,
        requiresPasswordChange: user.requiresPasswordChange,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        sedes: { include: { sede: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const ability = await this.abilityFactory.createForUser(user);
    const roles = user.roles?.map((ur: any) => ur.role.name) || [];

    return {
      id: user.id,
      username: user.username,
      email: user.correo,
      nombre: user.nombre,
      apellidos: user.apellidos,
      imagen: user.imagen,
      cargo: user.cargoStr,
      celular: user.celular,
      genero: user.genero,
      licenciatura: user.licenciatura,
      direccion: user.direccion,
      curriculum: user.curriculum,
      fechaNacimiento: user.fechaNacimiento,
      estadoCivil: user.estadoCivil,
      facebook: user.facebook,
      tiktok: user.tiktok,
      tenantId: user.tenantId,
      tenant: user.tenant,
      roles: roles,
      permissions: ability.rules,
      estado: user.estado,
      sedes: user.sedes,
      requiresPasswordChange: user.requiresPasswordChange,
    };
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      username: payload.username,
      tenantId: payload.tenantId,
      roles: payload.roles,
      sedes: payload.sedes,
    };
  }
}
