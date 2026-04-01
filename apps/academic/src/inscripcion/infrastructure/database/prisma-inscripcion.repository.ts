import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';
import { Inscripcion } from '../../domain/entities/inscripcion.entity';

@Injectable()
export class PrismaInscripcionRepository implements IInscripcionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Inscripcion | null> {
    const data = await this.prisma.programaInscripcion.findUnique({
      where: { id },
      include: {
        programa: {
          include: {
            version: true,
          },
        },
        sede: true,
        estadoInscripcion: true,
        persona: true,
        turno: {
          include: {
            turnoConfig: true,
          },
        },
        baucher: true,
      },
    });
    return data ? new Inscripcion(data as any) : null;
  }

  async findAll(filter: any = {}): Promise<Inscripcion[]> {
    const data = await this.prisma.programaInscripcion.findMany({
      where: { ...filter, estado: { not: 'eliminado' } },
      include: {
        programa: {
          include: {
            version: true,
          },
        },
        sede: true,
        estadoInscripcion: true,
        persona: true,
        turno: {
          include: {
            turnoConfig: true,
          },
        },
        baucher: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return data.map((d) => new Inscripcion(d as any));
  }

  async findByPersonaAndPrograma(
    personaId: string,
    programaId: string,
  ): Promise<Inscripcion | null> {
    const data = await this.prisma.programaInscripcion.findFirst({
      where: {
        personaId,
        programaId,
        estado: { not: 'eliminado' },
      },
    });
    return data ? new Inscripcion(data as any) : null;
  }

  async checkTurnAvailability(
    programaId: string,
    turnoId: string,
  ): Promise<{ cupo: number; cupoPre: number } | null> {
    const turno = await this.prisma.programaDosTurno.findFirst({
      where: {
        id: turnoId,
        programaDosId: programaId,
        estado: 'activo',
      },
    });

    if (!turno) return null;

    return {
      cupo: turno.cupo,
      cupoPre: turno.cupoPre,
    };
  }

  async reserveCupo(programaId: string, turnoId: string): Promise<boolean> {
    try {
      // Utilizamos actualización atómica para evitar "Race Conditions".
      // Prisma `updateMany` con condiciones permite que la db ejecute check e incremento en 1 query seguro.
      const result = await this.prisma.programaDosTurno.updateMany({
        where: {
          id: turnoId,
          programaDosId: programaId,
          estado: 'activo',
          cupoPre: {
            lt: this.prisma.programaDosTurno.fields.cupo, // Asegurarse que cupoPre sea estrictamente menor a cupo
          },
        },
        data: {
          cupoPre: {
            increment: 1,
          },
        },
      });

      return result.count > 0;
    } catch (error) {
      return false;
    }
  }

  async create(data: any): Promise<Inscripcion> {
    // Handling some default mapping if necessary
    const created = await this.prisma.programaInscripcion.create({
      data: {
        personaId: data.personaId,
        programaId: data.programaId,
        turnoId: data.turnoId,
        sedeId: data.sedeId,
        estadoInscripcionId:
          data.estadoInscripcionId || '05a0199e-76f8-4b72-97ad-e78a632128bd', // Example UUID if not provided
        observacion: data.observacion,
        createdBy: data.createdBy,
        documentoDigital: data.documentoDigital,
        licenciatura: data.licenciatura,
        unidadEducativa: data.unidadEducativa,
        estado: 'activo',
      },
    });
    return new Inscripcion(created as any);
  }

  async update(id: string, data: any): Promise<Inscripcion> {
    const updated = await this.prisma.programaInscripcion.update({
      where: { id },
      data: {
        turnoId: data.turnoId,
        sedeId: data.sedeId,
        estadoInscripcionId: data.estadoInscripcionId,
        observacion: data.observacion,
        licenciatura: data.licenciatura,
        unidadEducativa: data.unidadEducativa,
        estado: data.estado,
        updatedBy: data.updatedBy,
      },
    });
    return new Inscripcion(updated as any);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.programaInscripcion.update({
      where: { id },
      data: { estado: 'eliminado' },
    });
  }

  async updateBaucher(baucherId: string, data: any): Promise<void> {
    await this.prisma.programaBaucher.update({
      where: { id: baucherId },
      data,
    });
  }

  async findBaucherById(baucherId: string): Promise<any | null> {
    return this.prisma.programaBaucher.findUnique({
      where: { id: baucherId },
    });
  }
}
