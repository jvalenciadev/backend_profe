import { PrismaService } from './database.service';

export class GenericCrudService<T> {
    constructor(
        protected readonly prisma: PrismaService,
        protected readonly modelName: string,
        protected readonly hasStatus: boolean = true
    ) { }

    async create(data: any, user?: any) {
        const res = await (this.prisma[this.modelName] as any).create({
            data: {
                ...data,
                createdBy: user?.id ? BigInt(user.id) : undefined,
            },
        });
        return res;
    }

    async findAll(filter: any = {}) {
        const where: any = { ...filter };
        if (this.hasStatus) {
            where.estado = { not: 'ELIMINADO' };
        }
        const res = await (this.prisma[this.modelName] as any).findMany({
            where,
        });
        return res;
    }

    async findOne(id: string | number) {
        const res = await (this.prisma[this.modelName] as any).findUnique({
            where: { id: BigInt(id) },
        });
        return res;
    }

    async update(id: string | number, data: any, user?: any) {
        const res = await (this.prisma[this.modelName] as any).update({
            where: { id: BigInt(id) },
            data: {
                ...data,
                updatedBy: user?.id ? BigInt(user.id) : undefined,
            },
        });
        return res;
    }

    async remove(id: string | number, user?: any) {
        if (this.hasStatus) {
            return await (this.prisma[this.modelName] as any).update({
                where: { id: BigInt(id) },
                data: {
                    estado: 'ELIMINADO',
                    deletedAt: new Date(),
                    deletedBy: user?.id ? BigInt(user.id) : undefined,
                },
            });
        }
        return await (this.prisma[this.modelName] as any).delete({
            where: { id: BigInt(id) },
        });
    }
}
