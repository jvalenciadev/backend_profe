import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService, AppAbility, MailService } from '@app/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private caslPrisma: CaslPrismaService,
    private mailService: MailService,
  ) { }

  async create(data: any, currentUser: any) {
    const {
      roles,
      sedes,
      email,
      password: providedPassword,
      ...userData
    } = data;
    const password = providedPassword || 'secret123';
    const hashedPassword = await bcrypt.hash(password, 12);
    const correo = email || data.correo;

    const allowedFields = [
      'nombre',
      'apellidos',
      'imagen',
      'genero',
      'licenciatura',
      'direccion',
      'curriculum',
      'fechaNacimiento',
      'estadoCivil',
      'facebook',
      'tiktok',
      'cargo',
      'celular',
      'tenantId',
      'personaId',
      'estado',
      'username',
      'cargoPostulacionId',
      'ci',
    ];

    const createData: any = {
      password: hashedPassword,
      correo: correo,
      username: data.username,
      tenantId: data.tenantId || currentUser?.tenantId || null,
      createdBy: currentUser?.id || null,
    };

    allowedFields.forEach((field) => {
      if (userData[field] !== undefined) {
        let value = userData[field];
        if (
          (field === 'tenantId' ||
            field === 'personaId' ||
            field === 'cargoPostulacionId') &&
          value === ''
        ) {
          value = null;
        }

        if (field === 'cargo') {
          createData['cargoStr'] = value;
        } else if (field === 'ci') {
          createData['ci'] = value ? BigInt(value) : null;
        } else if (
          createData[field] === undefined ||
          (field === 'tenantId' && value !== null)
        ) {
          createData[field] = value;
        }
      }
    });

    const user = await this.prisma.user.create({
      data: {
        ...createData,
        roles: roles
          ? {
            create: roles.map((roleId: string) => ({
              roleId,
              modelType: 'App\\User',
            })),
          }
          : undefined,
        sedes: sedes
          ? {
            create: sedes.map((sedeId: string) => ({
              sedeId,
            })),
          }
          : undefined,
      },
    });

    // Enviar correo de bienvenida al nuevo admin
    await this.mailService.sendWelcomeEmail(
      user.correo,
      user.nombre,
      user.username,
    );

    return user;
  }

  async findAll(ability: AppAbility, search?: string) {
    const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'User');

    let searchWhere: any = {};
    if (search) {
      searchWhere = {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { apellidos: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { correo: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [caslWhere, searchWhere, { estado: { not: 'eliminado' } }],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        sedes: { include: { sede: true } },
        tenant: true,
        cargoPostulacion: true,
        bp_posgrado: {
          include: {
            bp_tipo_posgrado: true,
          },
        },
        bp_produccion_intelectual: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async findOne(id: string, ability: AppAbility) {
    const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'User');

    const user = await this.prisma.user.findFirst({
      where: {
        AND: [caslWhere, { id: id, estado: { not: 'eliminado' } }],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        sedes: { include: { sede: true } },
        tenant: true,
        cargoPostulacion: true,
        bp_posgrado: {
          include: {
            bp_tipo_posgrado: true,
          },
        },
        bp_produccion_intelectual: true,
      },
    });
    if (!user)
      throw new NotFoundException(
        `Usuario no encontrado o no tiene permisos para verlo`,
      );
    return user;
  }

  async update(id: string, data: any, currentUser: any, ability?: AppAbility) {
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'User');
      const targetUser = await this.prisma.user.findFirst({
        where: { AND: [caslWhere, { id }] },
      });
      if (!targetUser)
        throw new ForbiddenException(
          'No tiene permisos para actualizar este usuario',
        );
    }

    const { roles, sedes, email, ...userData } = data;

    const allowedFields = [
      'nombre',
      'apellidos',
      'imagen',
      'genero',
      'licenciatura',
      'direccion',
      'curriculum',
      'fechaNacimiento',
      'estadoCivil',
      'facebook',
      'tiktok',
      'cargo',
      'celular',
      'tenantId',
      'personaId',
      'estado',
      'username',
      'password',
      'verificationCode',
      'resumenProfesional',
      'habilidades',
      'idiomas',
      'experienciaLaboral',
      'linkedinUrl',
      'cargoPostulacionId',
      'ci',
    ];

    const updateData: any = {
      updatedBy: currentUser?.id || null,
    };

    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw new NotFoundException('Usuario no encontrado');

    // Si el usuario requiere cambio de contraseña, validar el código enviado al correo
    if (targetUser.requiresPasswordChange && data.verificationCode) {
      if (targetUser.resetPasswordToken !== data.verificationCode) {
        throw new ForbiddenException('Código de verificación incorrecto');
      }
    } else if (targetUser.requiresPasswordChange && !data.verificationCode) {
      throw new ForbiddenException('El código de verificación es obligatorio');
    }

    allowedFields.forEach((field) => {
      if (userData[field] !== undefined) {
        let value = userData[field];
        if (
          (field === 'tenantId' ||
            field === 'personaId' ||
            field === 'cargoPostulacionId') &&
          value === ''
        ) {
          value = null;
        }

        if (field === 'cargo') {
          updateData['cargoStr'] = value;
        } else if (field === 'ci') {
          updateData['ci'] = value ? BigInt(value) : null;
        } else if (field !== 'verificationCode') {
          // Filtramos el código de verificación
          updateData[field] = value;
        }
      }
    });

    if (email) updateData.correo = email;

    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      updateData.password = hashedPassword;
      updateData.requiresPasswordChange = false;
      updateData.resetPasswordToken = null;
      updateData.resetPasswordExpires = null;
    }

    if (roles) {
      updateData.roles = {
        deleteMany: {},
        create: roles.map((roleId: string) => ({
          roleId,
          modelType: 'App\\User',
        })),
      };
    }

    if (sedes) {
      updateData.sedes = {
        deleteMany: {},
        create: sedes.map((sedeId: string) => ({
          sedeId,
        })),
      };
    }

    const user = await this.prisma.user.update({
      where: { id: id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        sedes: { include: { sede: true } },
        tenant: true,
        cargoPostulacion: true,
      },
    });

    return user;
  }

  async remove(id: string, currentUser: any) {
    const user = await this.prisma.user.update({
      where: { id: id },
      data: {
        estado: 'eliminado',
        deletedAt: new Date(),
        deletedBy: currentUser?.id || null,
      },
    });
    return user;
  }

  async requestEmailVerification(id: string, email: string) {
    const token = crypto.randomInt(100000, 999999).toString();
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 15); // Código válido por 15 min

    await this.prisma.user.update({
      where: { id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiryDate,
      },
    });

    await this.mailService.sendPasswordResetEmail(
      email,
      token,
      'Usuario de Validación',
    );
    return { message: 'Código enviado correctamente' };
  }

  async resetPassword(id: string, currentUser: any) {
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1); // 1 día para cambiarla

    // Generar un código de 6 dígitos para verificación
    const token = crypto.randomInt(100000, 999999).toString();

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        requiresPasswordChange: true,
        resetPasswordExpires: expiryDate,
        updatedBy: currentUser?.id || null,
        resetPasswordToken: token,
      },
    });

    // Enviar correo al correo actual registrado
    await this.mailService.sendPasswordResetEmail(
      user.correo,
      token,
      user.nombre,
    );

    return user;
  }
}
