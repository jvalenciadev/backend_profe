import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { IOfertaRepository } from '../../domain/repositories/oferta.repository.interface';
import { Oferta } from '../../domain/entities/oferta.entity';

@Injectable()
export class PrismaOfertaRepository implements IOfertaRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Oferta | null> {
        const data = await this.prisma.programaDos.findUnique({
            where: { id },
            include: {
                programa: true,
                sede: true,
                turnos: true,
                modulos: true,
            }
        });
        return data ? new Oferta(data) : null;
    }

    async findAll(filter: any = {}): Promise<Oferta[]> {
        const data = await this.prisma.programaDos.findMany({
            where: { ...filter, estado: { not: 'eliminado' } },
            include: {
                programa: true,
                sede: true,
                turnos: true,
                modulos: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return data.map(d => new Oferta(d));
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
                turnos: true,
                modulos: true,
            }
        });
        return new Oferta(updated);
    }

    async incrementCupoPreinscrito(ofertaId: string, turnoId: string): Promise<void> {
        await this.prisma.programaDosTurno.update({
            where: { id: turnoId },
            data: { cupoPre: { increment: 1 } }
        });
    }
}
