import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import type {
  ISedeRepository,
  SedeFilters,
} from '../../domain/repositories/sede.repository.interface';
import { Sede } from '../../domain/entities/sede.entity';

import { CaslPrismaService } from '@app/common';

@Injectable()
export class PrismaSedeRepository implements ISedeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) { }

  private mapToDomain(record: any): Sede {
    return new Sede(
      record.id,
      record.nombre,
      record.departamentoId,
      record.latitud ? Number(record.latitud) : 0,
      record.longitud ? Number(record.longitud) : 0,
      record.estado || 'activo',
      record.nombreAbreviado,
      record.descripcion,
      record.imagen,
      record.nombreResponsable1,
      record.cargoResponsable1,
      record.imagenResponsable1,
      record.nombreResponsable2,
      record.cargoResponsable2,
      record.imagenResponsable2,
      record.contacto1,
      record.contacto2,
      record.facebook,
      record.tiktok,
      record.grupoWhatsapp,
      record.horario,
      record.turno,
      record.ubicacion,
      record.departamento,
    );
  }

  private mapToPrisma(data: any): any {
    const prismaData: any = { ...data };

    // Mapeo de nombres Domain -> Prisma Model
    if (data.nombreAbre !== undefined) {
      prismaData.nombreAbreviado = data.nombreAbre;
      delete prismaData.nombreAbre;
    }
    if (data.nombreResp1 !== undefined) {
      prismaData.nombreResponsable1 = data.nombreResp1;
      delete prismaData.nombreResp1;
    }
    if (data.cargoResp1 !== undefined) {
      prismaData.cargoResponsable1 = data.cargoResp1;
      delete prismaData.cargoResp1;
    }
    if (data.imagenResp1 !== undefined) {
      prismaData.imagenResponsable1 = data.imagenResp1;
      delete prismaData.imagenResp1;
    }
    if (data.nombreResp2 !== undefined) {
      prismaData.nombreResponsable2 = data.nombreResp2;
      delete prismaData.nombreResp2;
    }
    if (data.cargoResp2 !== undefined) {
      prismaData.cargoResponsable2 = data.cargoResp2;
      delete prismaData.cargoResp2;
    }
    if (data.imagenResp2 !== undefined) {
      prismaData.imagenResponsable2 = data.imagenResp2;
      delete prismaData.imagenResp2;
    }
    if (data.whatsapp !== undefined) {
      prismaData.grupoWhatsapp = data.whatsapp;
      delete prismaData.whatsapp;
    }

    // Limpieza de IDs innecesarios que no deben ir en el update
    delete prismaData.id;
    delete prismaData.departamento;

    return prismaData;
  }

  async create(data: Omit<Sede, 'id'>): Promise<Sede> {
    const prismaData = this.mapToPrisma(data);
    const record = await (this.prisma.sede as any).create({ data: prismaData });
    return this.mapToDomain(record);
  }

  async findById(id: string, ability?: any): Promise<Sede | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Sede');
      where = { AND: [where, caslWhere] };
    }

    const record = await (this.prisma.sede as any).findFirst({
      where,
      include: { departamento: true },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(
    filters: SedeFilters = {},
    ability?: any,
    user?: any,
  ): Promise<{ data: Sede[]; total: number }> {
    const { search, estado, page = 1, limit = 20 } = filters;
    let where: any = { estado: { not: 'eliminado' } };
    if (estado && estado !== 'todos') where.estado = estado;
    if (search) where.nombre = { contains: search, mode: 'insensitive' };

    // Apply User-Sedes/Tenant filtering if the user is not superadmin
    if (user && user.tenantId) {
      if (user.sedes && user.sedes.length > 0) {
        where.id = { in: user.sedes };
      }
      where.departamentoId = user.tenantId;
    }

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Sede');
      where = { AND: [where, caslWhere] };
    }

    const [total, data] = await Promise.all([
      (this.prisma.sede as any).count({ where }),
      (this.prisma.sede as any).findMany({
        where,
        include: { departamento: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: data.map((item: any) => this.mapToDomain(item)),
      total,
    };
  }

  async update(id: string, data: Partial<Sede>): Promise<Sede> {
    const prismaData = this.mapToPrisma(data);
    const record = await (this.prisma.sede as any).update({
      where: { id },
      data: prismaData,
      include: { departamento: true },
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.sede as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
