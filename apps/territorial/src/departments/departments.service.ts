import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crear un nuevo departamento
   */
  async create(createDepartmentDto: CreateDepartmentDto, user: any) {
    try {
      // Validaciones
      if (
        !createDepartmentDto.nombre ||
        createDepartmentDto.nombre.trim() === ''
      ) {
        throw new BadRequestException(
          'El nombre del departamento es requerido',
        );
      }

      if (
        !createDepartmentDto.abreviacion ||
        createDepartmentDto.abreviacion.trim() === ''
      ) {
        throw new BadRequestException(
          'La abreviación del departamento es requerida',
        );
      }

      // Verificar si ya existe un departamento con el mismo nombre
      const existing = await this.prisma.departamento.findFirst({
        where: {
          nombre: createDepartmentDto.nombre,
          estado: { not: 'eliminado' },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe un departamento con el nombre "${createDepartmentDto.nombre}"`,
        );
      }

      const dep = await this.prisma.departamento.create({
        data: {
          nombre: createDepartmentDto.nombre.trim(),
          abreviacion: createDepartmentDto.abreviacion.trim(),
          createdBy: user?.id || null,
        },
      });

      await this.audit('CREATE', 'departamento', dep.id, user, dep);

      this.logger.log(
        `Departamento creado: ${dep.nombre} (ID: ${dep.id}) por usuario ${user?.username || 'desconocido'}`,
      );

      return {
        success: true,
        message: 'Departamento creado exitosamente',
        data: dep,
      };
    } catch (error) {
      this.logger.error('Error al crear departamento:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al crear el departamento. Por favor, intente nuevamente',
      );
    }
  }

  /**
   * Listar todos los departamentos activos
   */
  async findAll() {
    try {
      const departamentos = await this.prisma.departamento.findMany({
        where: { estado: 'activo' },
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          abreviacion: true,
          estado: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        message: 'Departamentos obtenidos exitosamente',
        data: departamentos,
        total: departamentos.length,
      };
    } catch (error) {
      this.logger.error('Error al listar departamentos:', error);
      throw new InternalServerErrorException(
        'Error al obtener la lista de departamentos',
      );
    }
  }

  /**
   * Obtener un departamento por ID
   */
  async findOne(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('ID de departamento requerido');
      }

      const dep = await this.prisma.departamento.findFirst({
        where: {
          id: id,
          estado: 'activo',
        },
        include: {
          sedes: {
            where: { estado: 'activo' },
            select: {
              id: true,
              nombre: true,
              nombreAbreviado: true,
              ubicacion: true,
            },
          },
          _count: {
            select: {
              sedes: true,
              users: true,
            },
          },
        },
      });

      if (!dep) {
        throw new NotFoundException(
          `No se encontró el departamento con ID ${id} o fue eliminado`,
        );
      }

      return {
        success: true,
        message: 'Departamento obtenido exitosamente',
        data: dep,
      };
    } catch (error) {
      this.logger.error(`Error al obtener departamento ${id}:`, error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener el departamento',
      );
    }
  }

  /**
   * Actualizar un departamento
   */
  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
    user: any,
  ) {
    try {
      if (!id) {
        throw new BadRequestException('ID de departamento requerido');
      }

      // Verificar que el departamento existe
      const existing = await this.prisma.departamento.findUnique({
        where: { id: id },
      });

      if (!existing) {
        throw new NotFoundException(
          `No se encontró el departamento con ID ${id}`,
        );
      }

      if (existing.estado === 'eliminado') {
        throw new BadRequestException(
          'No se puede actualizar un departamento eliminado',
        );
      }

      // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
      if (
        updateDepartmentDto.nombre &&
        updateDepartmentDto.nombre !== existing.nombre
      ) {
        const duplicate = await this.prisma.departamento.findFirst({
          where: {
            nombre: updateDepartmentDto.nombre,
            id: { not: id },
            estado: { not: 'eliminado' },
          },
        });

        if (duplicate) {
          throw new BadRequestException(
            `Ya existe otro departamento con el nombre "${updateDepartmentDto.nombre}"`,
          );
        }
      }

      const dep = await this.prisma.departamento.update({
        where: { id: id },
        data: {
          ...(updateDepartmentDto.nombre && {
            nombre: updateDepartmentDto.nombre.trim(),
          }),
          ...(updateDepartmentDto.abreviacion && {
            abreviacion: updateDepartmentDto.abreviacion.trim(),
          }),
          updatedBy: user?.id || null,
        },
      });

      await this.audit('UPDATE', 'departamento', dep.id, user, {
        old: existing,
        new: dep,
      });

      this.logger.log(
        `Departamento actualizado: ${dep.nombre} (ID: ${dep.id}) por usuario ${user?.username || 'desconocido'}`,
      );

      return {
        success: true,
        message: 'Departamento actualizado exitosamente',
        data: dep,
      };
    } catch (error) {
      this.logger.error(`Error al actualizar departamento ${id}:`, error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al actualizar el departamento',
      );
    }
  }

  /**
   * Eliminar un departamento (soft delete)
   */
  async remove(id: string, user: any) {
    try {
      if (!id) {
        throw new BadRequestException('ID de departamento requerido');
      }

      // Verificar que el departamento existe
      const existing = await this.prisma.departamento.findUnique({
        where: { id: id },
        include: {
          _count: {
            select: {
              sedes: { where: { estado: 'activo' } },
              users: { where: { estado: 'activo' } },
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException(
          `No se encontró el departamento con ID ${id}`,
        );
      }

      if (existing.estado === 'eliminado') {
        throw new BadRequestException(
          'El departamento ya fue eliminado previamente',
        );
      }

      // Verificar si tiene sedes o usuarios activos
      if (existing._count.sedes > 0) {
        throw new BadRequestException(
          `No se puede eliminar el departamento porque tiene ${existing._count.sedes} sede(s) activa(s). ` +
            'Primero debe eliminar o reasignar las sedes',
        );
      }

      if (existing._count.users > 0) {
        throw new BadRequestException(
          `No se puede eliminar el departamento porque tiene ${existing._count.users} usuario(s) activo(s). ` +
            'Primero debe eliminar o reasignar los usuarios',
        );
      }

      const dep = await this.prisma.departamento.update({
        where: { id: id },
        data: {
          estado: 'eliminado',
          deletedAt: new Date(),
          deletedBy: user?.id || null,
        },
      });

      await this.audit('DELETE', 'departamento', dep.id, user, {
        deleted: existing,
      });

      this.logger.log(
        `Departamento eliminado: ${dep.nombre} (ID: ${dep.id}) por usuario ${user?.username || 'desconocido'}`,
      );

      return {
        success: true,
        message: 'Departamento eliminado exitosamente',
        data: { id: dep.id, nombre: dep.nombre },
      };
    } catch (error) {
      this.logger.error(`Error al eliminar departamento ${id}:`, error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al eliminar el departamento',
      );
    }
  }

  /**
   * Registrar auditoría
   */
  private async audit(
    action: string,
    resource: string,
    resourceId: string,
    user: any,
    details: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          resource,
          resourceId: resourceId,
          userId: user?.id || null,
          details: JSON.stringify(details),
          ip: user?.ip || '127.0.0.1',
          userAgent: user?.userAgent || 'unknown',
        },
      });
    } catch (e) {
      this.logger.error('Error al registrar auditoría:', e);
      // No lanzar error para no interrumpir la operación principal
    }
  }
}
