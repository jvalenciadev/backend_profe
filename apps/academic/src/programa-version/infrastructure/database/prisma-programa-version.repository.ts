import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IProgramaVersionRepository } from '../../domain/repositories/programa-version.repository.interface';

@Injectable()
export class PrismaProgramaVersionRepository implements IProgramaVersionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  private mapRecord(record: any) {
    if (!record) return null;
    return {
      ...record,
      nombreAbre: record.nombreAbreviado,
      fechaIniIns: record.fechaInicioInscripcion,
      fechaFinIns: record.fechaFinInscripcion,
      fechaIniClase: record.fechaInicioClases,
      turnos: record.turnos?.map((t: any) => ({
        ...t,
        turnoIds: t.turnoId,
      })),
    };
  }

  async findAll(filter: any = {}, ability?: any, user?: any): Promise<any[]> {
    const { tenantId, search, sedeId, ...rest } = filter;
    let where: any = { ...rest };
    if (sedeId) where.sedeId = sedeId;
    const hasStatus = true;
    if (hasStatus) where.estado = { not: 'eliminado' };

    // Apply User-Sedes/Tenant filtering if the user is not superadmin
    if (user && user.tenantId) {
      if (sedeId) {
        where.sedeId = sedeId;
      } else if (user.sedes && user.sedes.length > 0) {
        where.sedeId = { in: user.sedes };
      }
      where.departamentoId = user.tenantId;
    }

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'ProgramaVersion',
      );
      where = { AND: [where, caslWhere] };
    }

    const records = await this.prisma.programaDos.findMany({
      where,
      include: {
        modulos: {
          orderBy: { orden: 'asc' },
        },
        turnos: {
          include: {
            turnoConfig: true,
          },
        },
        programa: true,
        version: true,
        sede: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapRecord(r));
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'ProgramaVersion',
      );
      where = { AND: [where, caslWhere] };
    }
    const record = await this.prisma.programaDos.findFirst({
      where,
      include: {
        modulos: {
          orderBy: { orden: 'asc' },
        },
        turnos: {
          include: {
            turnoConfig: true,
          },
        },
        programa: true,
        version: true,
        sede: true,
      },
    });

    return this.mapRecord(record);
  }

  async create(
    data: any,
    userId?: string,
    forcedTenantId?: string,
  ): Promise<any> {
    const {
      modulos,
      turnos,
      nombreAbre,
      nombreAbreviado,
      fechaIniIns,
      fechaInicioInscripcion,
      fechaFinIns,
      fechaFinInscripcion,
      fechaIniClase,
      fechaInicioClases,
      estado,
      programa,
      version,
      sede,
      createdAt,
      updatedAt,
      deletedAt,
      createdBy,
      updatedBy,
      deletedBy,
      programaId,
      versionId,
      sedeId,
      duracionId,
      tipoId,
      modalidadId,
      departamentoId,
      ...rest
    } = data;

    const record = await this.prisma.programaDos.create({
      data: {
        ...rest,
        nombreAbreviado: nombreAbre || nombreAbreviado || rest.nombreAbreviado,
        fechaInicioInscripcion: fechaIniIns
          ? new Date(fechaIniIns)
          : fechaInicioInscripcion
            ? new Date(fechaInicioInscripcion)
            : new Date(),
        fechaFinInscripcion: fechaFinIns
          ? new Date(fechaFinIns)
          : fechaFinInscripcion
            ? new Date(fechaFinInscripcion)
            : new Date(),
        fechaInicioClases: fechaIniClase
          ? new Date(fechaIniClase)
          : fechaInicioClases
            ? new Date(fechaInicioClases)
            : new Date(),
        estado: (estado || 'activo').toLowerCase(),
        // IDs
        programaId: data.programaId,
        versionId: data.versionId,
        sedeId: data.sedeId,
        duracionId: data.duracionId,
        tipoId: data.tipoId,
        modalidadId: data.modalidadId,
        departamentoId: data.departamentoId,
        createdBy: userId,
        modulos:
          modulos && Array.isArray(modulos)
            ? {
                create: modulos.map((m: any) => ({
                  nombre: m.nombre,
                  codigo: m.codigo,
                  descripcion: m.descripcion || '',
                  orden: m.orden ?? m.pm_orden ?? 0,
                  moduloMaestroId: m.moduloMaestroId || null,
                  fechaInicio: m.fechaInicio
                    ? new Date(m.fechaInicio)
                    : new Date(),
                  fechaFin: m.fechaFin ? new Date(m.fechaFin) : new Date(),
                  estado: (m.estado || 'activo').toLowerCase(),
                  createdBy: userId,
                })),
              }
            : undefined,
        turnos:
          turnos && Array.isArray(turnos)
            ? {
                create: turnos.map((t: any) => ({
                  turnoId: t.turnoIds || t.turnoId || t.id,
                  cupo: Number(t.cupo) || 0,
                  cupoPre: Number(t.cupoPre) || 0,
                  estado: (t.estado || 'activo').toLowerCase(),
                  createdBy: userId,
                })),
              }
            : undefined,
      },
      include: { modulos: true, turnos: true },
    });

    return this.mapRecord(record);
  }

  async update(
    id: string,
    data: any,
    userId?: string,
    ability?: any,
  ): Promise<any> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'update',
        'ProgramaVersion',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await this.prisma.programaDos.findFirst({ where });
    if (!exists)
      throw new Error(
        'No tiene permisos para editar este registro o no existe',
      );

    const {
      modulos,
      turnos,
      programa,
      version,
      sede,
      nombreAbre,
      nombreAbreviado,
      fechaIniIns,
      fechaInicioInscripcion,
      fechaFinIns,
      fechaFinInscripcion,
      fechaIniClase,
      fechaInicioClases,
      estado,
      createdAt,
      updatedAt,
      deletedAt,
      createdBy,
      updatedBy,
      deletedBy,
      programaId,
      versionId,
      sedeId,
      duracionId,
      tipoId,
      modalidadId,
      departamentoId,
      ...rest
    } = data;

    const updateData: any = {
      ...rest,
      nombreAbreviado: nombreAbre || nombreAbreviado || data.nombreAbreviado,
      fechaInicioInscripcion: fechaIniIns
        ? new Date(fechaIniIns)
        : fechaInicioInscripcion
          ? new Date(fechaInicioInscripcion)
          : data.fechaInicioInscripcion,
      fechaFinInscripcion: fechaFinIns
        ? new Date(fechaFinIns)
        : fechaFinInscripcion
          ? new Date(fechaFinInscripcion)
          : data.fechaFinInscripcion,
      fechaInicioClases: fechaIniClase
        ? new Date(fechaIniClase)
        : fechaInicioClases
          ? new Date(fechaInicioClases)
          : data.fechaInicioClases,
      estado: (estado || 'activo').toLowerCase(),
      // Add back the IDs extracted for data cleaning
      programaId: programaId || data.programaId,
      versionId: versionId || data.versionId,
      sedeId: sedeId || data.sedeId,
      tipoId: tipoId || data.tipoId,
      modalidadId: modalidadId || data.modalidadId,
      duracionId: duracionId || data.duracionId,
      departamentoId: departamentoId || data.departamentoId,
      updatedBy: userId,
    };

    if (modulos && Array.isArray(modulos)) {
      const existingIds = modulos
        .filter((m: any) => m.id)
        .map((m: any) => m.id);
      updateData.modulos = {
        deleteMany: { id: { notIn: existingIds } },
        update: modulos
          .filter((m: any) => m.id)
          .map((m: any) => ({
            where: { id: m.id },
            data: {
              nombre: m.nombre,
              codigo: m.codigo,
              descripcion: m.descripcion || '',
              orden: m.orden ?? m.pm_orden ?? 0,
              moduloMaestroId: m.moduloMaestroId || undefined,
              fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : undefined,
              fechaFin: m.fechaFin ? new Date(m.fechaFin) : undefined,
              estado: (m.estado || 'activo').toLowerCase(),
              updatedBy: userId,
            },
          })),
        create: modulos
          .filter((m: any) => !m.id)
          .map((m: any) => ({
            nombre: m.nombre,
            codigo: m.codigo,
            descripcion: m.descripcion || '',
            orden: m.orden ?? m.pm_orden ?? 0,
            moduloMaestroId: m.moduloMaestroId || null,
            fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : new Date(),
            fechaFin: m.fechaFin ? new Date(m.fechaFin) : new Date(),
            estado: (m.estado || 'activo').toLowerCase(),
            updatedBy: userId,
          })),
      };
    }

    if (turnos && Array.isArray(turnos)) {
      const existingIds = turnos.filter((t: any) => t.id).map((t: any) => t.id);
      updateData.turnos = {
        deleteMany: { id: { notIn: existingIds } },
        update: turnos
          .filter((t: any) => t.id)
          .map((t: any) => ({
            where: { id: t.id },
            data: {
              turnoId: t.turnoIds || t.turnoId || t.id,
              cupo: Number(t.cupo) || 0,
              cupoPre: Number(t.cupoPre) || 0,
              estado: (t.estado || 'activo').toLowerCase(),
              updatedBy: userId,
            },
          })),
        create: turnos
          .filter((t: any) => !t.id)
          .map((t: any) => ({
            turnoId: t.turnoIds || t.turnoId || t.id,
            cupo: Number(t.cupo) || 0,
            cupoPre: Number(t.cupoPre) || 0,
            estado: (t.estado || 'activo').toLowerCase(),
            updatedBy: userId,
          })),
      };
    }

    const record = await this.prisma.programaDos.update({
      where: { id },
      data: updateData,
      include: { modulos: true, turnos: true },
    });

    return this.mapRecord(record);
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'delete',
        'ProgramaVersion',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await this.prisma.programaDos.findFirst({ where });
    if (!exists)
      throw new Error(
        'No tiene permisos para eliminar este registro o no existe',
      );

    const hasStatus = true;
    if (hasStatus) {
      await this.prisma.programaDos.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await this.prisma.programaDos.delete({ where: { id } });
    }
  }
}
