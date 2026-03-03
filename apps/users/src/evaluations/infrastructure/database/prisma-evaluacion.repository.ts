import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { IEvaluacionRepository, CreatePeriodoData, CreateEvaluacionData } from '../../domain/repositories/evaluacion.repository.interface';
import { EvaluacionAdmin, EvaluacionPeriodo } from '../../domain/entities/evaluacion.entity';

@Injectable()
export class PrismaEvaluacionRepository implements IEvaluacionRepository {
    constructor(private readonly prisma: PrismaService) { }

    private get db(): any { return this.prisma as any; }

    // ── PERIODOS ─────────────────────────────────────────────────────────────

    async createPeriodo(data: CreatePeriodoData): Promise<EvaluacionPeriodo> {
        const { criterios, ...periodoData } = data;
        const record = await this.db.evaluacionPeriodo.create({
            data: {
                ...periodoData,
                criterios: { create: criterios.map((c, i) => ({ nombre: c.nombre, puntajeMaximo: c.puntajeMaximo, orden: c.orden ?? i })) },
            },
            include: { criterios: { orderBy: { orden: 'asc' } } },
        });
        return this.mapPeriodo(record);
    }

    async findAllPeriodos(): Promise<EvaluacionPeriodo[]> {
        const records = await this.db.evaluacionPeriodo.findMany({
            where: { estado: { not: 'eliminado' } },
            include: { criterios: { orderBy: { orden: 'asc' } } },
            orderBy: [{ gestion: 'desc' }, { semestre: 'asc' }],
        });
        return records.map((r: any) => this.mapPeriodo(r));
    }

    async findPeriodoById(id: string): Promise<EvaluacionPeriodo | null> {
        const record = await this.db.evaluacionPeriodo.findFirst({
            where: { id, estado: { not: 'eliminado' } },
            include: { criterios: { orderBy: { orden: 'asc' } } },
        });
        return record ? this.mapPeriodo(record) : null;
    }

    async togglePeriodo(id: string, activo: boolean): Promise<EvaluacionPeriodo> {
        const record = await this.db.evaluacionPeriodo.update({ where: { id }, data: { activo } });
        return this.mapPeriodo(record);
    }

    async deletePeriodo(id: string): Promise<void> {
        await this.db.evaluacionPeriodo.update({ where: { id }, data: { estado: 'eliminado', deletedAt: new Date() } });
    }

    // ── EVALUACIONES ─────────────────────────────────────────────────────────

    async create(data: CreateEvaluacionData & { puntajeTotal: number; codigoVerificacion: string; qrCode: string; cargoId?: string | null }): Promise<EvaluacionAdmin> {
        // Obtener cargoId del usuario si no se pasa
        const userToEval = await this.db.user.findFirst({
            where: { id: data.userId },
            select: { cargoPostulacionId: true, tenantId: true },
        });

        const record = await this.db.evaluacionAdmins.create({
            data: {
                userId: data.userId,
                periodoId: data.periodoId,
                tenantId: data.tenantId || userToEval?.tenantId,
                cargoId: data.cargoId ?? userToEval?.cargoPostulacionId,
                puntajeTotal: data.puntajeTotal,
                codigoVerificacion: data.codigoVerificacion,
                qrCode: data.qrCode,
                createdBy: data.createdBy,
                updatedBy: data.createdBy,
                puntajes: { create: data.puntajes.map((p) => ({ criterioId: p.criterioId, puntaje: Number(p.puntaje) })) },
            },
            include: {
                user: { select: { id: true, nombre: true, apellidos: true, username: true, correo: true, imagen: true } },
                periodoEval: true,
                puntajes: { include: { criterio: true } },
            },
        });
        return this.mapEvaluacion(record);
    }

    async findAll(tenantId?: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
        const isUuid = (val?: string) => !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const where: any = { estado: { not: 'eliminado' } };
        if (tenantId && isUuid(tenantId)) where.tenantId = tenantId;
        if (periodoId && isUuid(periodoId)) where.periodoId = periodoId;

        const records = await this.db.evaluacionAdmins.findMany({
            where,
            include: {
                user: { select: { id: true, nombre: true, apellidos: true, username: true, correo: true } },
                periodoEval: true,
                puntajes: { include: { criterio: true }, orderBy: { criterio: { orden: 'asc' } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return records.map((r: any) => this.mapEvaluacion(r));
    }

    async findById(id: string): Promise<EvaluacionAdmin | null> {
        const record = await this.db.evaluacionAdmins.findFirst({
            where: { id, estado: { not: 'eliminado' } },
            include: {
                user: { select: { id: true, nombre: true, apellidos: true, username: true, correo: true, imagen: true, ci: true, sedes: { include: { sede: true } } } },
                cargo: true,
                periodoEval: { include: { criterios: { orderBy: { orden: 'asc' } } } },
                puntajes: { include: { criterio: true }, orderBy: { criterio: { orden: 'asc' } } },
            },
        });
        return record ? this.mapEvaluacion(record) : null;
    }

    async findByUser(userId: string): Promise<EvaluacionAdmin[]> {
        const records = await this.db.evaluacionAdmins.findMany({
            where: { userId, estado: { not: 'eliminado' } },
            include: {
                periodoEval: true,
                puntajes: { include: { criterio: true }, orderBy: { criterio: { orden: 'asc' } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return records.map((r: any) => this.mapEvaluacion(r));
    }

    async findByVerificationCode(code: string): Promise<EvaluacionAdmin | null> {
        const record = await this.db.evaluacionAdmins.findFirst({
            where: { codigoVerificacion: code, estado: { not: 'eliminado' } },
            include: {
                user: { select: { nombre: true, apellidos: true, username: true } },
                periodoEval: true,
                puntajes: { include: { criterio: true }, orderBy: { criterio: { orden: 'asc' } } },
            },
        });
        return record ? this.mapEvaluacion(record) : null;
    }

    async existsActiveForUserInPeriodo(userId: string, periodoId: string): Promise<boolean> {
        const count = await this.db.evaluacionAdmins.count({
            where: { userId, periodoId, estado: { not: 'eliminado' } },
        });
        return count > 0;
    }

    async findUsersToEvaluate(tenantId?: string, periodoId?: string): Promise<any[]> {
        const isUuid = (val?: string) => !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const where: any = { estado: 'activo' };
        if (tenantId && isUuid(tenantId)) where.tenantId = tenantId;

        const evalSelect = periodoId && isUuid(periodoId)
            ? { where: { periodoId }, select: { id: true, puntajeTotal: true } }
            : false;

        return this.db.user.findMany({
            where,
            select: {
                id: true, nombre: true, apellidos: true, username: true, correo: true, imagen: true,
                roles: { include: { role: true } },
                evaluaciones: evalSelect,
            },
        });
    }

    // ── MAPPERS ───────────────────────────────────────────────────────────────

    private mapPeriodo(record: any): EvaluacionPeriodo {
        const periodo = new EvaluacionPeriodo(
            record.id, record.gestion, record.semestre, record.periodo, record.activo, record.estado,
        );
        if (record.criterios) {
            periodo.criterios = record.criterios.map((c: any) => ({
                id: c.id, periodoId: c.periodoId, nombre: c.nombre, puntajeMaximo: c.puntajeMaximo, orden: c.orden,
            }));
        }
        return periodo;
    }

    private mapEvaluacion(record: any): EvaluacionAdmin {
        return new EvaluacionAdmin(
            record.id, record.userId, record.periodoId, record.tenantId, record.cargoId,
            record.puntajeTotal, record.codigoVerificacion, record.qrCode, record.estado,
            record.createdBy, record.updatedBy,
            record.puntajes, record.user, record.periodoEval,
        ) as any;
    }
}
