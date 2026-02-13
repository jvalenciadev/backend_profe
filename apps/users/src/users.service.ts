import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService, AppAbility } from '@app/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private caslPrisma: CaslPrismaService
  ) { }

  async create(data: any, currentUser: any) {
    const { roles, sedes, email, password: providedPassword, ...userData } = data;
    const password = providedPassword || 'secret123';
    const hashedPassword = await bcrypt.hash(password, 12);
    const correo = email || data.correo;

    const allowedFields = [
      'nombre', 'apellidos', 'imagen', 'genero', 'licenciatura',
      'direccion', 'curriculum', 'fechaNacimiento', 'estadoCivil',
      'facebook', 'tiktok', 'cargo', 'celular', 'tenantId', 'personaId',
      'estado', 'username'
    ];

    const createData: any = {
      password: hashedPassword,
      correo: correo,
      username: data.username,
      tenantId: data.tenantId || currentUser?.tenantId || null,
      createdBy: currentUser?.id || null,
    };

    allowedFields.forEach(field => {
      if (userData[field] !== undefined) {
        let value = userData[field];
        if ((field === 'tenantId' || field === 'personaId') && value === '') {
          value = null;
        }
        // Solo sobreescribir si no es uno de los campos base ya configurados arriba
        if (createData[field] === undefined || (field === 'tenantId' && value !== null)) {
          createData[field] = value;
        }
      }
    });

    const user = await this.prisma.user.create({
      data: {
        ...createData,
        roles: roles ? {
          create: roles.map((roleId: string) => ({
            roleId,
            modelType: 'App\\User'
          }))
        } : undefined,
        sedes: sedes ? {
          create: sedes.map((sedeId: string) => ({
            sedeId
          }))
        } : undefined,
      },
    });

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
          { correo: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          caslWhere,
          { estado: { in: ['ACTIVO', 'INACTIVO'] } },
          searchWhere
        ]
      },
      include: {
        roles: { include: { role: true } },
        sedes: { include: { sede: true } },
        tenant: true,
      },
    });
    return users;
  }

  async findOne(id: string, ability: AppAbility) {
    const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'User');

    const user = await this.prisma.user.findFirst({
      where: {
        AND: [
          caslWhere,
          { id: id, estado: { in: ['ACTIVO', 'INACTIVO'] } }
        ]
      },
      include: {
        roles: { include: { role: true } },
        sedes: { include: { sede: true } },
        tenant: true,
      },
    });
    if (!user) throw new NotFoundException(`Usuario no encontrado o no tiene permisos para verlo`);
    return user;
  }

  async update(id: string, data: any, currentUser: any, ability?: AppAbility) {
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'User');
      const targetUser = await this.prisma.user.findFirst({
        where: { AND: [caslWhere, { id }] }
      });
      if (!targetUser) throw new ForbiddenException('No tiene permisos para actualizar este usuario');
    }

    const { roles, sedes, email, ...userData } = data;

    // Solo permitir campos que existen en el modelo User para evitar "Inconsistent column data"
    const allowedFields = [
      'nombre', 'apellidos', 'imagen', 'genero', 'licenciatura',
      'direccion', 'curriculum', 'fechaNacimiento', 'estadoCivil',
      'facebook', 'tiktok', 'cargo', 'celular', 'tenantId', 'personaId',
      'estado', 'username', 'password'
    ];

    const updateData: any = {
      updatedBy: currentUser?.id || null,
    };

    // Copiar solo campos permitidos y sanitizar UUIDs vacíos
    allowedFields.forEach(field => {
      if (userData[field] !== undefined) {
        let value = userData[field];
        if ((field === 'tenantId' || field === 'personaId') && value === '') {
          value = null;
        }
        updateData[field] = value;
      }
    });

    if (email) updateData.correo = email;

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    if (roles) {
      updateData.roles = {
        // Limpieza total antes de re-asignar para evitar conflictos de llave primaria o duplicados
        deleteMany: {},
        create: roles.map((roleId: string) => ({
          roleId,
          modelType: 'App\\User'
        }))
      };
    }

    if (sedes) {
      updateData.sedes = {
        // Limpieza total de sedes antes de re-asignar
        deleteMany: {},
        create: sedes.map((sedeId: string) => ({
          sedeId
        }))
      };
    }

    const user = await this.prisma.user.update({
      where: { id: id },
      data: updateData,
      include: {
        roles: { include: { role: true } },
        sedes: { include: { sede: true } },
        tenant: true
      }
    });

    return user;
  }

  async remove(id: string, currentUser: any) {
    const user = await this.prisma.user.update({
      where: { id: id },
      data: {
        estado: 'ELIMINADO',
        deletedAt: new Date(),
        deletedBy: currentUser?.id || null,
      },
    });
    return user;
  }
}
