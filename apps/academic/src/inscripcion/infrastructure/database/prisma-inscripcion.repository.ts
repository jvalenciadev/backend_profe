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
        persona: {
          include: {
            mod_campos_extra_regs: {
              include: {
                campoExtra: true,
              },
            },
          },
        },
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

  async findAll(filter: any = {}, user?: any): Promise<Inscripcion[]> {
    const { page = 1, limit = 50, search, versionId, sedeId, programaId, ...rest } = filter;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { ...rest, estado: { not: 'eliminado' } };

    // If an explicit programaId filter is provided, add it directly
    if (programaId) {
      where.programaId = programaId;
    }

    if (sedeId) {
      where.sedeId = sedeId;
    }

    // Apply User-Sedes/Tenant filtering if the user is not superadmin.
    // Skip sedeId restriction when filtering by a specific programaId so that
    // all inscriptions of that program are visible regardless of the user's assigned sedes.
    if (user && user.tenantId) {
      if (sedeId) {
        where.sedeId = sedeId;
      } else if (!programaId && user.sedes && user.sedes.length > 0) {
        where.sedeId = { in: user.sedes };
      }
      where.tenantId = user.tenantId;
    }

    if (search) {
      // Si el search parece un número (CI), buscar por CI.
      const ciValue = parseInt(search);
      if (!isNaN(ciValue)) {
        where.persona = {
          ci: BigInt(ciValue),
        };
      } else {
        // Opcional: Búsqueda por nombre si no es CI
        where.persona = {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { apellidos: { contains: search, mode: 'insensitive' } },
          ],
        };
      }
    }

    if (versionId) {
      where.programa = {
        versionId: versionId,
      };
    }

    const data = await this.prisma.programaInscripcion.findMany({
      where,
      include: {
        programa: {
          include: {
            version: true,
          },
        },
        sede: true,
        estadoInscripcion: true,
        persona: {
          include: {
            mod_campos_extra_regs: {
              include: {
                campoExtra: true,
              },
            },
          },
        },
        turno: {
          include: {
            turnoConfig: true,
          },
        },
        baucher: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
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
        tenantId: data.tenantId,
        estadoInscripcionId: data.estadoInscripcionId, // No default hardcoded ID here to avoid FK errors
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
        programaId: data.programaId,
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
