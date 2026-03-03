import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { EVALUACION_REPOSITORY } from '../../domain/repositories/evaluacion.repository.interface';
import type { IEvaluacionRepository } from '../../domain/repositories/evaluacion.repository.interface';
import { EvaluacionAdmin } from '../../domain/entities/evaluacion.entity';

@Injectable()
export class CreateEvaluacionUseCase {
    constructor(
        @Inject(EVALUACION_REPOSITORY)
        private readonly repository: IEvaluacionRepository,
        private readonly configService: ConfigService,
    ) { }

    async execute(
        data: any,
        responsableTenantId: string,
        currentUserId: string,
    ): Promise<EvaluacionAdmin> {
        const sourceData = data.evaluation ? { ...data, ...data.evaluation } : data;

        const userId = sourceData.userId || sourceData.id_usuario || sourceData.user_id;
        const periodoId = sourceData.periodoId || sourceData.id_periodo || sourceData.periodo_id;
        const rawPuntajes = sourceData.puntajes || sourceData.scores || [];

        const isUuid = (val: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val));

        if (!userId || !isUuid(userId))
            throw new BadRequestException(`ID de usuario inválido o ausente: ${userId}`);
        if (!periodoId || !isUuid(periodoId))
            throw new BadRequestException(`ID de período inválido o ausente: ${periodoId}`);

        // Normalizar puntajes y eliminar duplicados
        const puntajes: { criterioId: string; puntaje: number }[] = [];
        const seenCriterios = new Set<string>();
        for (const p of (Array.isArray(rawPuntajes) ? rawPuntajes : [])) {
            const criterioId = p.criterioId || p.id_criterio || p.criterio_id;
            const puntaje = p.puntaje !== undefined ? p.puntaje : p.valor !== undefined ? p.valor : p.score;
            if (criterioId && !seenCriterios.has(criterioId)) {
                seenCriterios.add(criterioId);
                puntajes.push({ criterioId, puntaje });
            }
        }

        // Validar que no existe evaluación ya activa
        const alreadyExists = await this.repository.existsActiveForUserInPeriodo(userId, periodoId);
        if (alreadyExists)
            throw new BadRequestException('Ya existe una evaluación activa para este usuario en este período');

        // Obtener período para validar criterios
        const periodo = await this.repository.findPeriodoById(periodoId);
        if (!periodo || !periodo.activo)
            throw new ForbiddenException('El período no existe o no está activo');

        // Validar puntajes contra criterios
        const criterioIds = (periodo.criterios || []).map((c) => c.id);
        for (const p of puntajes) {
            if (!criterioIds.includes(p.criterioId))
                throw new BadRequestException(`Criterio inválido: ${p.criterioId}`);
            const crit = periodo.criterios!.find((c) => c.id === p.criterioId)!;
            const val = Number(p.puntaje);
            if (val < 0 || val > crit.puntajeMaximo)
                throw new BadRequestException(
                    `Puntaje fuera de rango para ${crit.nombre}: ${val} (Max: ${crit.puntajeMaximo})`,
                );
        }

        const puntajeTotal = puntajes.reduce((sum, p) => sum + Number(p.puntaje), 0);
        const codigoVerificacion = await this.generateVerificationCode();

        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://aulaprofe.minedu.gob.bo';
        const qrCode = await QRCode.toDataURL(`${frontendUrl}/verificar-evaluacion?code=${codigoVerificacion}`);

        const targetTenantId = responsableTenantId && isUuid(responsableTenantId) ? responsableTenantId : null;

        return this.repository.create({
            userId,
            periodoId,
            tenantId: targetTenantId,
            puntajes,
            createdBy: currentUserId,
            puntajeTotal,
            codigoVerificacion,
            qrCode,
        });
    }

    private async generateVerificationCode(): Promise<string> {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const exists = await this.repository.findByVerificationCode(result);
        if (exists) return this.generateVerificationCode();
        return result;
    }
}

@Injectable()
export class GetEvaluacionesUseCase {
    constructor(
        @Inject(EVALUACION_REPOSITORY)
        private readonly repository: IEvaluacionRepository,
    ) { }

    async execute(tenantId?: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
        return this.repository.findAll(tenantId, periodoId);
    }
}

@Injectable()
export class GetEvaluacionByIdUseCase {
    constructor(
        @Inject(EVALUACION_REPOSITORY)
        private readonly repository: IEvaluacionRepository,
    ) { }

    async execute(id: string): Promise<EvaluacionAdmin> {
        const evaluacion = await this.repository.findById(id);
        if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
        return evaluacion;
    }
}

@Injectable()
export class GetMyEvaluacionesUseCase {
    constructor(
        @Inject(EVALUACION_REPOSITORY)
        private readonly repository: IEvaluacionRepository,
    ) { }

    async execute(userId: string): Promise<EvaluacionAdmin[]> {
        return this.repository.findByUser(userId);
    }
}

@Injectable()
export class VerifyEvaluacionCodeUseCase {
    constructor(
        @Inject(EVALUACION_REPOSITORY)
        private readonly repository: IEvaluacionRepository,
    ) { }

    async execute(code: string): Promise<{ valid: boolean; evaluation?: EvaluacionAdmin; message?: string }> {
        const evaluacion = await this.repository.findByVerificationCode(code);
        if (!evaluacion) return { valid: false, message: 'Código de verificación no válido' };
        return { valid: true, evaluation: evaluacion };
    }
}

@Injectable()
export class GetUsersToEvaluateUseCase {
    constructor(
        @Inject(EVALUACION_REPOSITORY)
        private readonly repository: IEvaluacionRepository,
    ) { }

    async execute(tenantId?: string, periodoId?: string): Promise<any[]> {
        return this.repository.findUsersToEvaluate(tenantId, periodoId);
    }
}
