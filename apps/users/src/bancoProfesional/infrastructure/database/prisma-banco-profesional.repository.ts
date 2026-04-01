import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { type IBancoProfesionalRepository } from '../../domain/repositories/banco-profesional.repository.interface';
import { BancoProfesional } from '../../domain/entities/banco-profesional.entity';

@Injectable()
export class PrismaBancoProfesionalRepository implements IBancoProfesionalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BancoProfesional | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        cargoPostulacion: true,
        tenant: true,
        bp_posgrado: { include: { bp_tipo_posgrado: true } },
        bp_produccion_intelectual: true,
      },
    });
    return user ? this.mapToEntity(user) : null;
  }

  async findAll(filter: any = {}): Promise<BancoProfesional[]> {
    const whereClause: any = { ...filter };
    if (!whereClause.estado) {
      whereClause.estado = { not: 'eliminado' };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        cargoPostulacion: true,
        tenant: true,
        bp_posgrado: { include: { bp_tipo_posgrado: true } },
        bp_produccion_intelectual: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.mapToEntity(u));
  }

  async update(id: string, data: any): Promise<BancoProfesional> {
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        cargoPostulacion: true,
        bp_posgrado: { include: { bp_tipo_posgrado: true } },
        bp_produccion_intelectual: true,
      },
    });
    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
  }

  async findByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<BancoProfesional | null> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ correo: email }, { username: username }] },
    });
    return user ? this.mapToEntity(user) : null;
  }

  async create(data: any): Promise<BancoProfesional> {
    const created = await this.prisma.user.create({
      data,
      include: { cargoPostulacion: true },
    });
    return this.mapToEntity(created);
  }

  // Posgrados
  async addPosgrado(data: any): Promise<any> {
    return this.prisma.bp_posgrado.create({
      data: {
        btp_id: data.tipoPosgradoId,
        bpg_titulo: data.titulo,
        bpg_fecha: new Date(data.fecha),
        bpg_imagen: data.imagen,
        user_id: data.userId || data.id, // Depends on how it's passed
        created_by: data.updatedBy,
        updated_at: new Date(),
      },
    });
  }

  async updatePosgrado(id: string, data: any): Promise<any> {
    return this.prisma.bp_posgrado.update({
      where: { bpg_id: id },
      data: {
        btp_id: data.tipoPosgradoId,
        bpg_titulo: data.titulo,
        bpg_fecha: data.fecha ? new Date(data.fecha) : undefined,
        bpg_imagen: data.imagen,
        updated_at: new Date(),
        updated_by: data.updatedBy,
      },
    });
  }

  async deletePosgrado(id: string): Promise<void> {
    await this.prisma.bp_posgrado.update({
      where: { bpg_id: id },
      data: { bpg_estado: 'eliminado', deleted_at: new Date() },
    });
  }

  // Producción
  async addProduccion(data: any): Promise<any> {
    return this.prisma.bp_produccion_intelectual.create({
      data: {
        bpi_titulo: data.titulo,
        bpi_anio_publicacion: parseInt(data.anioPublicacion),
        user_id: data.userId || data.id,
        created_by: data.updatedBy,
        updated_at: new Date(),
      },
    });
  }

  async updateProduccion(id: string, data: any): Promise<any> {
    return this.prisma.bp_produccion_intelectual.update({
      where: { bpi_id: id },
      data: {
        bpi_titulo: data.titulo,
        bpi_anio_publicacion: data.anioPublicacion
          ? parseInt(data.anioPublicacion)
          : undefined,
        updated_at: new Date(),
        updated_by: data.updatedBy,
      },
    });
  }

  async deleteProduccion(id: string): Promise<void> {
    await this.prisma.bp_produccion_intelectual.update({
      where: { bpi_id: id },
      data: { bpi_estado: 'eliminado', deleted_at: new Date() },
    });
  }

  private mapToEntity(data: any): BancoProfesional {
    if (!data) return null as any;

    const entityData = { ...data };

    // Convert BigInts
    if (data.ci !== undefined) entityData.ci = data.ci?.toString();
    if (data.rda !== undefined) entityData.rda = data.rda?.toString();

    // Standardize relation names for the entity and frontend
    if (data.bp_posgrado) {
      entityData.postgrados = data.bp_posgrado.map((p: any) => ({
        ...p,
        id: p.bpg_id,
        titulo: p.bpg_titulo,
        fecha: p.bpg_fecha,
        imagen: p.bpg_imagen,
        tipoPosgradoId: p.btp_id,
        tipoPosgrado: p.bp_tipo_posgrado
          ? {
              id: p.bp_tipo_posgrado.btp_id,
              nombre: p.bp_tipo_posgrado.btp_nombre,
              orden: p.bp_tipo_posgrado.btp_orden,
            }
          : null,
      }));
      delete entityData.bp_posgrado;
    }

    if (data.bp_produccion_intelectual) {
      entityData.produccionIntelectual = data.bp_produccion_intelectual.map(
        (p: any) => ({
          ...p,
          id: p.bpi_id,
          titulo: p.bpi_titulo,
          anioPublicacion: p.bpi_anio_publicacion,
        }),
      );
      delete entityData.bp_produccion_intelectual;
    }

    // Add user object for frontend backward compatibility if needed
    if (data.id && data.username && !data.user) {
      entityData.user = {
        id: data.id,
        nombre: data.nombre,
        apellidos: data.apellidos,
        correo: data.correo,
        username: data.username,
        ci: entityData.ci,
        rda: entityData.rda,
        fechaNacimiento: data.fechaNacimiento,
        celular: data.celular,
        genero: data.genero,
        direccion: data.direccion,
        estadoCivil: data.estadoCivil,
        imagen: data.imagen,
        departamento: data.tenant?.nombre || 'No asignado',
      };
    }

    return new BancoProfesional(entityData);
  }
}
