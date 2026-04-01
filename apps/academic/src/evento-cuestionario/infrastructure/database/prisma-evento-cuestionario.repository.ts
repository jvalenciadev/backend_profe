import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IEventoCuestionarioRepository } from '../../domain/repositories/evento-cuestionario.repository.interface';

@Injectable()
export class PrismaEventoCuestionarioRepository implements IEventoCuestionarioRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  async findAll(filter: any = {}, ability?: any): Promise<any[]> {
    const { tenantId, search, ...rest } = filter;
    let where: any = { ...rest };
    // Always filter out deleted records
    where.estado = { not: 'eliminado' };

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'EventoCuestionario',
      );
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).eventoCuestionario.findMany({
      where,
      orderBy: { orden: 'asc' },
      include: {
        preguntas: {
          where: { estado: { not: 'eliminado' } },
        },
      },
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'EventoCuestionario',
      );
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).eventoCuestionario.findFirst({
      where,
      include: {
        preguntas: {
          where: { estado: { not: 'eliminado' } },
        },
      },
    });
  }

  async findProgressForPersona(
    eventoId: string,
    personaId: string,
  ): Promise<any[]> {
    // 1. Get all questionnaires for the event, ordered
    const questionnaires = await (
      this.prisma as any
    ).eventoCuestionario.findMany({
      where: { eventoId, estado: { not: 'eliminado' } },
      orderBy: { orden: 'asc' },
    });

    // 2. Get attempts made by the persona
    const attempts = await (
      this.prisma as any
    ).eventoCuestionarioIntento.findMany({
      where: {
        personaId,
        cuestionarioId: { in: questionnaires.map((q: any) => q.id) },
      },
    });

    // 3. Map each questionnaire with its progress status
    let canProceed = true;
    return questionnaires.map((q: any) => {
      const attempt = attempts.find((a: any) => a.cuestionarioId === q.id);
      const isFinished = attempt?.estado === 'finished';
      const isPassed = q.esEvaluativo
        ? isFinished && attempt.puntaje >= (q.puntajeMinimo || 0)
        : isFinished;

      const status = {
        isOpened: canProceed,
        isFinished,
        isPassed,
        attempt: attempt || null,
      };

      // If questionnaire is mandatory and not passed, next ones are blocked
      if (q.esObligatorio && !isPassed) {
        canProceed = false;
      }

      return { ...q, progress: status };
    });
  }

  async create(
    data: any,
    userId?: string,
    forcedTenantId?: string,
  ): Promise<any> {
    return await (this.prisma as any).eventoCuestionario.create({
      data: { ...data, createdBy: userId },
    });
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
        'EventoCuestionario',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).eventoCuestionario.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para editar este registro o no existe',
      );

    return await (this.prisma as any).eventoCuestionario.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'delete',
        'EventoCuestionario',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).eventoCuestionario.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para eliminar este registro o no existe',
      );

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).eventoCuestionario.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).eventoCuestionario.delete({ where: { id } });
    }
  }
}
