import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { MailService } from '@app/common';
import * as bcrypt from 'bcryptjs';

export interface BulkImportUsersDto {
  roleIds: string[];
  usuarios: {
    ci: string | number;
    complemento?: string;
    nombre: string;
    apellidos: string;
    correo?: string;
    username?: string;
    password?: string;
    celular?: string | number;
    cargo?: string;
    licenciatura?: string;
    genero?: string;
    direccion?: string;
  }[];
}

@Injectable()
export class BulkImportUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: IUserRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async execute(dto: BulkImportUsersDto, currentUser?: any) {
    const results = {
      success: 0,
      errors: [] as { ci: string; error: string }[],
    };

    if (!dto.usuarios || !Array.isArray(dto.usuarios) || dto.usuarios.length === 0) {
      throw new BadRequestException('La lista de usuarios a importar está vacía o es inválida');
    }

    const defaultPassword = 'AulaProfe*2026';
    const salt = await bcrypt.genSalt(10);
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, salt);

    for (const u of dto.usuarios) {
      const ciStr = u.ci ? String(u.ci).trim() : '';
      if (!ciStr) {
        results.errors.push({
          ci: 'N/A',
          error: 'El campo de identificación (CI) es obligatorio',
        });
        continue;
      }

      if (!u.nombre || !u.apellidos) {
        results.errors.push({
          ci: ciStr,
          error: 'El nombre y apellidos son obligatorios',
        });
        continue;
      }

      try {
        const ciBigInt = BigInt(ciStr);
        const email = u.correo ? String(u.correo).trim() : `${ciStr}@aulaprofe.com`;
        const username = u.username ? String(u.username).trim() : ciStr;

        // Validar si ya existe un usuario por CI
        const existingCi = await this.prisma.user.findFirst({
          where: { ci: ciBigInt, estado: { not: 'eliminado' } },
        });

        if (existingCi) {
          results.errors.push({
            ci: ciStr,
            error: `El CI ${ciStr} ya se encuentra registrado.`,
          });
          continue;
        }

        // Validar si ya existe un usuario por correo
        const existingEmail = await this.prisma.user.findFirst({
          where: { correo: email, estado: { not: 'eliminado' } },
        });

        if (existingEmail) {
          results.errors.push({
            ci: ciStr,
            error: `El correo ${email} ya está registrado.`,
          });
          continue;
        }

        // Validar si ya existe un usuario por username
        const existingUsername = await this.prisma.user.findFirst({
          where: { username: username, estado: { not: 'eliminado' } },
        });

        if (existingUsername) {
          results.errors.push({
            ci: ciStr,
            error: `El nombre de usuario ${username} ya está en uso.`,
          });
          continue;
        }

        // Preparar contraseña
        const customPassword = u.password ? String(u.password).trim() : null;
        const hashedPassword = customPassword
          ? await bcrypt.hash(customPassword, salt)
          : hashedDefaultPassword;

        // Crear el usuario usando el repositorio
        await this.repository.create({
          ci: ciBigInt,
          complemento: u.complemento ? String(u.complemento).trim() : null,
          nombre: String(u.nombre).trim(),
          apellidos: String(u.apellidos).trim(),
          correo: email,
          username: username,
          password: hashedPassword,
          celular: u.celular ? String(u.celular).trim() : null,
          cargoStr: u.cargo ? String(u.cargo).trim() : null,
          licenciatura: u.licenciatura ? String(u.licenciatura).trim() : null,
          genero: u.genero || 'No prefiero decirlo',
          direccion: u.direccion ? String(u.direccion).trim() : null,
          estado: 'activo',
          createdBy: currentUser?.id || null,
          tenantId: currentUser?.tenantId || null,
          roles: dto.roleIds || [],
          sedes: [],
        });

        // Intentar enviar email de bienvenida en segundo plano
        this.mailService
          .sendWelcomeEmail(email, u.nombre, username)
          .catch(() => null);

        results.success++;
      } catch (error: any) {
        results.errors.push({
          ci: ciStr,
          error: error.message || 'Error desconocido al registrar',
        });
      }
    }

    return results;
  }
}
