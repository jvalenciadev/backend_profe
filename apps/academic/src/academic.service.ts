import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, GenericCrudService } from '@app/database';

@Injectable()
export class AcademicService extends GenericCrudService<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'programa'); // Default model
  }

  // --- PROGRAMAS ---
  async createPrograma(data: any, user: any) {
    const programa = await this.prisma.programa.create({
      data: {
        nombre: data.nombre,
        codigo: data.codigo,
        contenido: data.contenido,
        cargaHoraria: data.cargaHoraria,
        costo: data.costo,
        banner: data.banner || '',
        afiche: data.afiche || '',
        fechaIniIns: new Date(data.fechaIniIns),
        fechaFinIns: new Date(data.fechaFinIns),
        fechaIniClase: new Date(data.fechaIniClase),
        tenantId: user.tenantId ? BigInt(user.tenantId) : null,
        duracionId: BigInt(data.duracionId),
        versionId: BigInt(data.versionId),
        tipoId: BigInt(data.tipoId),
        modalidadId: BigInt(data.modalidadId),
        createdBy: user.id ? BigInt(user.id) : null,
      }
    });
    return programa;
  }

  async findAllProgramas(tenantId?: string) {
    const where: any = { estado: 'ACTIVO' };
    if (tenantId) where.tenantId = BigInt(tenantId);

    const res = await this.prisma.programa.findMany({
      where,
      include: {
        tipo: true,
        version: true,
        modalidad: true,
        duracion: true
      }
    });
    return res;
  }

  // Generic methods for other models in Academic context
  async createGeneric(model: string, data: any, user: any) {
    const res = await (this.prisma[model] as any).create({
      data: {
        ...data,
        createdBy: user?.id ? BigInt(user.id) : null,
      }
    });
    return res;
  }

  async findAllGeneric(model: string, filter: any = {}) {
    const res = await (this.prisma[model] as any).findMany({
      where: { ...filter, estado: 'ACTIVO' }
    });
    return res;
  }

  // Specific for Módulos
  async createModulo(data: any) {
    return this.prisma.programaModulo.create({
      data: {
        nombre: data.nombre,
        codigo: data.codigo,
        descripcion: data.descripcion,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
        programaId: BigInt(data.programaId),
      }
    });
  }

  // Specific for Inscripciones
  async inscribir(data: any, user: any) {
    const inscripcion = await this.prisma.programaInscripcion.create({
      data: {
        programaId: BigInt(data.programaId),
        personaId: BigInt(data.personaId),
        sedeId: BigInt(data.sedeId),
        turnoId: BigInt(data.turnoId),
        estadoInscripcionId: BigInt(data.estadoInscripcionId || 1),
        tenantId: user.tenantId ? BigInt(user.tenantId) : null,
        createdBy: user.id ? BigInt(user.id) : null,
      }
    });
    return inscripcion;
  }
}
