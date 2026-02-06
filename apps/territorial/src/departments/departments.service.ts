import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) { }

  async create(createDepartmentDto: CreateDepartmentDto, user: any) {
    const dep = await this.prisma.departamento.create({
      data: {
        nombre: createDepartmentDto.nombre,
        abreviacion: createDepartmentDto.abreviacion,
        createdBy: user?.id || null,
      },
    });

    await this.audit('CREATE', 'departamento', dep.id, user, dep);
    return dep;
  }

  async findAll() {
    return this.prisma.departamento.findMany({
      where: { estado: 'ACTIVO' } // Filter by Active
    });
  }

  async findOne(id: number) {
    const dep = await this.prisma.departamento.findFirst({
      where: { id: BigInt(id), estado: 'ACTIVO' }
    });
    if (!dep) throw new NotFoundException(`Department #${id} not found`);

    // Serialize BigInt
    return this.serialize(dep);
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto, user: any) {
    const old = await this.findOne(id);

    const dep = await this.prisma.departamento.update({
      where: { id: BigInt(id) },
      data: {
        ...updateDepartmentDto,
        updatedBy: user?.id || null,
      },
    });

    await this.audit('UPDATE', 'departamento', dep.id, user, { old, new: dep });
    return this.serialize(dep);
  }

  async remove(id: number, user: any) {
    // Soft Delete
    const dep = await this.prisma.departamento.update({
      where: { id: BigInt(id) },
      data: {
        estado: 'ELIMINADO',
        deletedAt: new Date(),
        deletedBy: user?.id || null
      }
    });

    await this.audit('DELETE', 'departamento', dep.id, user, null);
    return this.serialize(dep);
  }

  private async audit(action: string, resource: string, resourceId: bigint, user: any, details: any) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId: resourceId.toString(),
        userId: user?.id ? BigInt(user.id) : null,
        details: JSON.stringify(details),
        ip: '127.0.0.1' // Mock, actual should come from request
      }
    });
  }

  private serialize(obj: any) {
    // Helper to handle BigInt serialization for JSON
    return JSON.parse(JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value
    ));
  }
}
