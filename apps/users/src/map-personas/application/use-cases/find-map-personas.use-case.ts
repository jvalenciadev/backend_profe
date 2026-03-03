import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class FindMapPersonasUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: any) {
        const { search, page = 1, limit = 12, carId, catId, nivId, subId, estado } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            estado: estado || { not: 'eliminado' },
        };

        if (search) {
            where.OR = [
                { ci: { contains: search, mode: 'insensitive' } },
                { nombre1: { contains: search, mode: 'insensitive' } },
                { nombre2: { contains: search, mode: 'insensitive' } },
                { apellido1: { contains: search, mode: 'insensitive' } },
                { apellido2: { contains: search, mode: 'insensitive' } },
                { rda: isNaN(Number(search)) ? undefined : { equals: BigInt(search) } }
            ].filter(Boolean) as any;
        }

        if (carId) where.carId = carId;
        if (catId) where.catId = catId;
        if (nivId) where.nivId = nivId;
        if (subId) where.subId = subId;

        const [total, data] = await Promise.all([
            this.prisma.mapPersona.count({ where }),
            this.prisma.mapPersona.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    cargo: true,
                    categoria: true,
                    nivel: true,
                    subsistema: true,
                    especialidad: true,
                    genero: true,
                    area: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            page: Number(page),
        };
    }
}
