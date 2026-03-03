import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IProgramaVersionRepository } from '../../domain/repositories/programa-version.repository.interface';

@Injectable()
export class PrismaProgramaVersionRepository implements IProgramaVersionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) { }

  async findAll(filter: any = {}, ability?: any): Promise<any[]> {
    const { tenantId, search, ...rest } = filter;
    let where: any = { ...rest };
    const hasStatus = true;
    if (hasStatus) where.estado = { not: 'eliminado' };

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'ProgramaVersion');
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).programaDos.findMany({
      where,
      include: {
        modulos: true,
        turnos: true,
        programa: true,
        version: true,
        sede: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'ProgramaVersion');
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).programaDos.findFirst({
      where,
      include: {
        modulos: true,
        turnos: true,
        programa: true,
        version: true,
        sede: true,
      }
    });
  }

  async create(data: any, userId?: string, forcedTenantId?: string): Promise<any> {
    const {
      modulos, turnos,
      nombreAbre, fechaIniIns, fechaFinIns, fechaIniClase,
      estado,
      ...rest
    } = data;

    return await (this.prisma as any).programaDos.create({
      data: {
        ...rest,
        nombreAbreviado: nombreAbre || data.nombreAbreviado,
        fechaInicioInscripcion: fechaIniIns ? new Date(fechaIniIns) : (data.fechaInicioInscripcion || new Date()),
        fechaFinInscripcion: fechaFinIns ? new Date(fechaFinIns) : (data.fechaFinInscripcion || new Date()),
        fechaInicioClases: fechaIniClase ? new Date(fechaIniClase) : (data.fechaInicioClases || new Date()),
        estado: (estado || 'activo').toLowerCase(),
        createdBy: userId,
        modulos: modulos && Array.isArray(modulos) ? {
          create: modulos.map((m: any) => ({
            nombre: m.nombre,
            codigo: m.codigo,
            descripcion: m.descripcion,
            notaMinima: Number(m.notaMinima) || 69,
            fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : new Date(),
            fechaFin: m.fechaFin ? new Date(m.fechaFin) : new Date(),
            estado: (m.estado || 'activo').toLowerCase(),
            createdBy: userId,
          }))
        } : undefined,
        turnos: turnos && Array.isArray(turnos) ? {
          create: turnos.map((t: any) => ({
            turnoIds: t.turnoIds,
            cupo: Number(t.cupo),
            cupoPre: Number(t.cupoPre) || 0,
            estado: (t.estado || 'activo').toLowerCase(),
            createdBy: userId,
          }))
        } : undefined
      },
      include: { modulos: true, turnos: true }
    });
  }

  async update(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'ProgramaVersion');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).programaDos.findFirst({ where });
    if (!exists) throw new Error('No tiene permisos para editar este registro o no existe');

    const {
      modulos, turnos,
      programa, version, sede,
      nombreAbre, fechaIniIns, fechaFinIns, fechaIniClase,
      estado,
      ...rest
    } = data;

    const updateData: any = {
      ...rest,
      nombreAbreviado: nombreAbre || data.nombreAbreviado,
      fechaInicioInscripcion: fechaIniIns ? new Date(fechaIniIns) : data.fechaInicioInscripcion,
      fechaFinInscripcion: fechaFinIns ? new Date(fechaFinIns) : data.fechaFinInscripcion,
      fechaInicioClases: fechaIniClase ? new Date(fechaIniClase) : data.fechaInicioClases,
      estado: (estado || 'activo').toLowerCase(),
      updatedBy: userId
    };

    if (modulos && Array.isArray(modulos)) {
      updateData.modulos = {
        deleteMany: {},
        create: modulos.map((m: any) => ({
          nombre: m.nombre,
          codigo: m.codigo,
          descripcion: m.descripcion,
          notaMinima: Number(m.notaMinima) || 69,
          fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : new Date(),
          fechaFin: m.fechaFin ? new Date(m.fechaFin) : new Date(),
          estado: (m.estado || 'activo').toLowerCase(),
          updatedBy: userId,
        }))
      };
    }

    if (turnos && Array.isArray(turnos)) {
      updateData.turnos = {
        deleteMany: {},
        create: turnos.map((t: any) => ({
          turnoIds: t.turnoIds,
          cupo: Number(t.cupo),
          cupoPre: Number(t.cupoPre) || 0,
          estado: t.estado || 'activo',
          updatedBy: userId,
        }))
      };
    }

    return await (this.prisma as any).programaDos.update({
      where: { id },
      data: updateData,
      include: { modulos: true, turnos: true }
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'delete', 'ProgramaVersion');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).programaDos.findFirst({ where });
    if (!exists) throw new Error('No tiene permisos para eliminar este registro o no existe');

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).programaDos.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).programaDos.delete({ where: { id } });
    }
  }
}