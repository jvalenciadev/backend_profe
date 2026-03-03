import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ICargoRepository, CargoFilters } from '../../domain/repositories/cargo.repository.interface';
import { Cargo } from '../../domain/entities/cargo.entity';

@Injectable()
export class PrismaCargoRepository implements ICargoRepository {
    constructor(private readonly prisma: PrismaService) { }

    private mapToDomain(record: any): Cargo {
        return new Cargo(
            record.id,
            record.nombre,
            record.estado as string, // prisma enums
            record.createdAt,
            record.updatedAt,
            record.deletedAt,
            record.createdBy,
            record.updatedBy,
            record.deletedBy,
        );
    }

    async create(cargo: Omit<Cargo, 'id'>): Promise<Cargo> {
        const data = await this.prisma.cargo.create({
            data: {
                nombre: cargo.nombre,
                estado: (cargo.estado as any) || 'activo',
                createdBy: cargo.createdBy,
            },
        });
        return this.mapToDomain(data);
    }

    async findById(id: string): Promise<Cargo | null> {
        const data = await this.prisma.cargo.findUnique({ where: { id } });
        return data ? this.mapToDomain(data) : null;
    }

    async findAll(filters: CargoFilters = {}): Promise<{ data: Cargo[]; total: number }> {
        const { search, estado, page = 1, limit = 20 } = filters;
        const where: any = { estado: { not: 'eliminado' } };

        if (estado && estado !== 'todos') {
            where.estado = estado;
        }
        if (search) {
            where.nombre = { contains: search, mode: 'insensitive' };
        }

        const [total, data] = await Promise.all([
            this.prisma.cargo.count({ where }),
            this.prisma.cargo.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { nombre: 'asc' },
            }),
        ]);

        return {
            data: data.map((item) => this.mapToDomain(item)),
            total,
        };
    }

    async update(id: string, cargo: Partial<Cargo>): Promise<Cargo> {
        const data = await this.prisma.cargo.update({
            where: { id },
            data: {
                nombre: cargo.nombre,
                estado: cargo.estado as any,
                updatedBy: cargo.updatedBy,
            },
        });
        return this.mapToDomain(data);
    }

    async delete(id: string): Promise<boolean> {
        // Soft delete
        await this.prisma.cargo.update({
            where: { id },
            data: { estado: 'eliminado', deletedAt: new Date() },
        });
        return true;
    }
}
