import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { IOfertaRepository } from '../../domain/repositories/oferta.repository.interface';
import { Oferta } from '../../domain/entities/oferta.entity';

import { CaslPrismaService } from '@app/common';

@Injectable()
export class PrismaOfertaRepository implements IOfertaRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  async findById(id: string, ability?: any): Promise<Oferta | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'ProgramaDos',
      );
      where = { AND: [where, caslWhere] };
    }

    const data = await this.prisma.programaDos.findFirst({
      where,
      include: {
        programa: true,
        sede: true,
        turnos: {
          include: {
            turnoConfig: true,
          },
        },
        modulos: true,
        version: true,
        inscripciones: {
          select: {
            id: true,
            turnoId: true,
            estadoInscripcion: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });
    return data ? new Oferta(data) : null;
  }

  async findAll(filter: any = {}, ability?: any): Promise<Oferta[]> {
    let where: any = { ...filter, estado: { not: 'eliminado' } };

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'ProgramaDos',
      );
      where = { AND: [where, caslWhere] };
    }

    const data = await this.prisma.programaDos.findMany({
      where,
      include: {
        programa: true,
        sede: true,
        turnos: {
          include: {
            turnoConfig: true,
          },
        },
        modulos: true,
        version: true,
        inscripciones: {
          select: {
            id: true,
            turnoId: true,
            estadoInscripcion: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return data.map((d) => new Oferta(d));
  }

  async update(id: string, data: any): Promise<Oferta> {
    // En este repositorio solemos pasar data cruda de Prisma,
    // pero para compatibilidad con el resto del sistema, aseguramos los includes.
    const updated = await this.prisma.programaDos.update({
      where: { id },
      data,
      include: {
        programa: true,
        sede: true,
        turnos: {
          include: {
            turnoConfig: true,
          },
        },
        modulos: true,
        version: true,
        inscripciones: {
          select: {
            id: true,
            turnoId: true,
            estadoInscripcion: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });
    return new Oferta(updated);
  }

  async incrementCupoPreinscrito(
    ofertaId: string,
    turnoId: string,
  ): Promise<void> {
    await this.prisma.programaDosTurno.update({
      where: { id: turnoId },
      data: { cupoPre: { increment: 1 } },
    });
  }
}
