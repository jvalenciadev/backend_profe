import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EvaluationsService {
    private readonly logger = new Logger(EvaluationsService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    // Cast a any: los nuevos modelos estarán tipados una vez que se ejecute `prisma generate`
    private get db(): any {
        return this.prisma as any;
    }

    // ─────────────────────────────────────────────────────────────
    // PERÍODOS (GLOBAL - cualquier admin puede crearlos/listarlos)
    // ─────────────────────────────────────────────────────────────

    /** Crear período global con sus criterios */
    async createPeriodo(data: {
        gestion: string;
        semestre: string;
        periodo: string;
        criterios: { nombre: string; puntajeMaximo: number; orden?: number }[];
    }) {
        const { criterios, ...periodoData } = data;
        return this.db.evaluacionPeriodo.create({
            data: {
                ...periodoData,
                criterios: {
                    create: criterios.map((c, i) => ({
                        nombre: c.nombre,
                        puntajeMaximo: c.puntajeMaximo,
                        orden: c.orden ?? i,
                    })),
                },
            },
            include: { criterios: { orderBy: { orden: 'asc' } } },
        });
    }

    /** Listar todos los períodos globales */
    async findPeriodos() {
        return this.db.evaluacionPeriodo.findMany({
            where: { estado: { not: 'eliminado' } },
            include: { criterios: { orderBy: { orden: 'asc' } } },
            orderBy: [{ gestion: 'desc' }, { semestre: 'asc' }],
        });
    }

    async findPeriodo(id: string) {
        const p = await this.db.evaluacionPeriodo.findFirst({
            where: { id, estado: { not: 'eliminado' } },
            include: { criterios: { orderBy: { orden: 'asc' } } },
        });
        if (!p) throw new NotFoundException('Período no encontrado');
        return p;
    }

    /** Activar/desactivar período (admin global) */
    async togglePeriodo(id: string, activo: boolean) {
        const p = await this.db.evaluacionPeriodo.findFirst({ where: { id } });
        if (!p) throw new NotFoundException('Período no encontrado');
        return this.db.evaluacionPeriodo.update({ where: { id }, data: { activo } });
    }

    async deletePeriodo(id: string) {
        const p = await this.db.evaluacionPeriodo.findFirst({ where: { id } });
        if (!p) throw new NotFoundException('Período no encontrado');
        return this.db.evaluacionPeriodo.update({
            where: { id },
            data: { estado: 'eliminado', deletedAt: new Date() },
        });
    }

    // ─────────────────────────────────────────────────────────────
    // EVALUACIONES (RESPONSABLE DEPARTAMENTAL evalúa su tenantId)
    // ─────────────────────────────────────────────────────────────

    /**
     * Crear evaluación.
     * - El período es global (activo).
     * - El RESPONSABLE solo puede evaluar usuarios de su mismo tenantId.
     * - puntajes: [{ criterioId, puntaje }]
     */
    async createEvaluation(
        data: any,
        responsableTenantId: string,
        currentUserId: string,
    ) {
        this.logger.log(`Starting createEvaluation for data: ${JSON.stringify(data)} by admin: ${currentUserId} `);

        // Support nested 'evaluation' object if present
        const sourceData = data.evaluation ? { ...data, ...data.evaluation } : data;

        const userId = sourceData.userId || sourceData.id_usuario || sourceData.user_id;
        const periodoId = sourceData.periodoId || sourceData.id_periodo || sourceData.periodo_id;
        const rawPuntajes = sourceData.puntajes || sourceData.scores || sourceData.id_criterio || []; // fallback case

        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val));

        // 0. Validaciones de formato UUID
        this.logger.log(`Validating userId: ${userId}`);
        if (!userId || !isUuid(userId)) {
            this.logger.error(`Validation failed: userId invalid(${userId}) from body ${JSON.stringify(sourceData)}`);
            throw new BadRequestException(`ID de usuario inválido o ausente: ${userId}.`);
        }
        this.logger.log(`Validating periodoId: ${periodoId}`);
        if (!periodoId || !isUuid(periodoId)) {
            this.logger.error(`Validation failed: periodoId invalid(${periodoId})`);
            throw new BadRequestException(`ID de período inválido o ausente: ${periodoId}.`);
        }

        let normalizedRawPuntajes = Array.isArray(rawPuntajes) ? rawPuntajes : [];
        if (!Array.isArray(rawPuntajes) && typeof rawPuntajes === 'object') {
            // Case where its an object instead of array
            normalizedRawPuntajes = [rawPuntajes];
        }

        // Eliminar duplicados y normalizar objetos internos de puntajes
        const puntajes: any[] = [];
        const seenCriterios = new Set();
        this.logger.log(`Normalizing rawPuntajes: ${JSON.stringify(normalizedRawPuntajes)}`);
        for (const p of normalizedRawPuntajes) {
            const criterioId = p.criterioId || p.id_criterio || p.criterio_id;
            const puntaje = p.puntaje !== undefined ? p.puntaje : (p.valor !== undefined ? p.valor : p.score);

            if (criterioId && !seenCriterios.has(criterioId)) {
                seenCriterios.add(criterioId);
                puntajes.push({ criterioId, puntaje });
            }
        }

        if (puntajes.length === 0) {
            this.logger.warn(`No valid puntajes found in: ${JSON.stringify(normalizedRawPuntajes)}`);
            // We might allow empty, but usually it's a mistake
        }

        // tenant_id ahora es opcional, se prefiere el del responsable
        const targetTenantId = (responsableTenantId && isUuid(responsableTenantId)) ? responsableTenantId : null;

        // 1. Verificar que el período global existe y está activo
        const periodo = await this.db.evaluacionPeriodo.findFirst({
            where: { id: periodoId, activo: true, estado: { not: 'eliminado' } },
            include: { criterios: { orderBy: { orden: 'asc' } } },
        });
        if (!periodo)
            throw new ForbiddenException('El período no existe o no está activo');

        // 2. Verificar que el usuario existe y está activo
        const userToEval = await this.db.user.findFirst({
            where: { id: userId, estado: 'activo' },
            select: { id: true, tenantId: true, cargoPostulacionId: true }
        });

        if (!userToEval)
            throw new ForbiddenException('El usuario no existe o no está activo');

        // 3. Verificar que no existe ya una evaluación activa
        const existing = await this.db.evaluacionAdmins.findFirst({
            where: {
                userId,
                periodoId,
                estado: { not: 'eliminado' }
            },
        });
        if (existing)
            throw new BadRequestException('Ya existe una evaluación activa para este usuario en este período');

        // 4. Validar puntajes
        const criterioIds = periodo.criterios.map((c: any) => c.id);
        for (const p of puntajes) {
            const currentPuntaje = Number(p.puntaje);
            if (!criterioIds.includes(p.criterioId))
                throw new BadRequestException(`Criterio inválido para este período: ${p.criterioId} `);
            const crit = periodo.criterios.find((c: any) => c.id === p.criterioId);
            if (currentPuntaje < 0 || currentPuntaje > crit.puntajeMaximo)
                throw new BadRequestException(`Puntaje fuera de rango para el criterio ${crit.nombre}: ${currentPuntaje} (Max: ${crit.puntajeMaximo})`);
        }

        const puntajeTotal = puntajes.reduce((sum, p) => sum + Number(p.puntaje), 0);
        const codigoVerificacion = await this.generateVerificationCode();
        // ... (resto intacto)

        // Generación dinámica del QR usando FRONTEND_URL de variables de entorno
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5415';
        const verificationUrl = `${frontendUrl}/verificar-evaluacion?code=${codigoVerificacion}`;
        const qrCode = await QRCode.toDataURL(verificationUrl);

        try {
            return await this.db.evaluacionAdmins.create({
                data: {
                    userId: userId,
                    periodoId: periodoId,
                    tenantId: targetTenantId || userToEval.tenantId,
                    cargoId: userToEval.cargoPostulacionId,
                    puntajeTotal,
                    codigoVerificacion,
                    qrCode,
                    createdBy: currentUserId,
                    updatedBy: currentUserId,
                    puntajes: {
                        create: puntajes.map((p) => ({
                            criterioId: p.criterioId,
                            puntaje: Number(p.puntaje),
                        })),
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nombre: true,
                            apellidos: true,
                            username: true,
                            correo: true,
                            imagen: true,
                        },
                    },
                    periodoEval: true,
                    puntajes: { include: { criterio: true } },
                },
            });
        } catch (error) {
            this.logger.error(`DATABASE ERROR at createEvaluation: ${error.message}`, error.stack);
            if (error.code === 'P2002') {
                throw new BadRequestException('Ya existe una evaluación activa para este usuario en este período (P2002)');
            }
            throw new BadRequestException(`Error al persistir la evaluación: ${error.message}`);
        }
    }

    /**
     * Listar evaluaciones del RESPONSABLE (filtradas por su tenantId).
     * Opcionalmente filtrar por periodoId.
     */
    async findEvaluaciones(tenantId: string, periodoId?: string) {
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        const where: any = { estado: { not: 'eliminado' } };
        if (tenantId && isUuid(tenantId)) where.tenantId = tenantId;
        if (periodoId && isUuid(periodoId)) where.periodoId = periodoId;

        return this.db.evaluacionAdmins.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        apellidos: true,
                        username: true,
                        correo: true,
                    },
                },
                periodoEval: true,
                puntajes: {
                    include: { criterio: true },
                    orderBy: { criterio: { orden: 'asc' } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findEvaluacion(id: string) {
        const e = await this.db.evaluacionAdmins.findFirst({
            where: { id, estado: { not: 'eliminado' } },
            include: {
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        apellidos: true,
                        username: true,
                        correo: true,
                        imagen: true,
                        ci: true,
                    },
                },
                cargo: true,
                periodoEval: { include: { criterios: { orderBy: { orden: 'asc' } } } },
                puntajes: {
                    include: { criterio: true },
                    orderBy: { criterio: { orden: 'asc' } },
                },
            },
        });
        if (!e) throw new NotFoundException('Evaluación no encontrada');
        return e;
    }

    /** Listar evaluaciones de un usuario específico (para su propio historial) */
    async findEvaluacionesByUser(userId: string) {
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        if (!userId || !isUuid(userId)) return [];

        return this.db.evaluacionAdmins.findMany({
            where: { userId, estado: { not: 'eliminado' } },
            include: {
                periodoEval: true,
                puntajes: {
                    include: { criterio: true },
                    orderBy: { criterio: { orden: 'asc' } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async verifyCode(code: string) {
        const e = await this.db.evaluacionAdmins.findFirst({
            where: { codigoVerificacion: code, estado: { not: 'eliminado' } },
            include: {
                user: { select: { nombre: true, apellidos: true, username: true } },
                periodoEval: true,
                puntajes: {
                    include: { criterio: true },
                    orderBy: { criterio: { orden: 'asc' } },
                },
            },
        });
        if (!e) return { valid: false, message: 'Código de verificación no válido' };
        return { valid: true, evaluation: e };
    }

    /**
     * Listar usuarios del mismo tenantId para que el RESPONSABLE pueda evaluarlos.
     * Indica si ya fueron evaluados en el período dado.
     */
    /**
     * Listar usuarios para evaluación.
     * - Si se proporciona tenantId, filtra por ese departamento.
     * - Si no se proporciona (SuperAdmin), lista todos los usuarios activos.
     * Indica si ya fueron evaluados en el período dado.
     */
    async getUsersToEvaluate(tenantId?: string, periodoId?: string) {
        const where: any = { estado: 'activo' };
        // Solo filtrar por tenantId si es un UUID válido
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        if (tenantId && isUuid(tenantId)) {
            where.tenantId = tenantId;
        }

        const evaluacionSelect = periodoId && isUuid(periodoId)
            ? {
                where: { periodoId },
                select: { id: true, puntajeTotal: true },
            }
            : false;

        return this.db.user.findMany({
            where,
            select: {
                id: true,
                nombre: true,
                apellidos: true,
                username: true,
                correo: true,
                imagen: true,
                roles: { include: { role: true } },
                evaluaciones: evaluacionSelect,
            },
        });
    }

    // ─────────────────────────────────────────────────────────────
    // PDF - Fiel al formato de la imagen
    // ─────────────────────────────────────────────────────────────

    async generatePDF(id: string): Promise<Buffer> {
        const evaluation = await this.findEvaluacion(id);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                margin: 50,
                size: 'LETTER',
                bufferPages: true,
            });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageW = doc.page.width;   // 612
            const pageH = doc.page.height;  // 792
            const margin = 50;
            const contentW = pageW - margin * 2;

            const RED = '#C0392B';
            const DARK_RED = '#8B0000';
            const BLACK = '#000000';
            const user = (evaluation.user as any) || {};

            // ── HEADER ──────────────────────────────────────────
            if (user.imagen) {
                const imgPath = path.join(process.cwd(), user.imagen);
                if (fs.existsSync(imgPath)) {
                    try {
                        doc.image(imgPath, margin, 25, { width: 55, height: 65 });
                    } catch (e) {
                        this.logger.error(`Error embedding image in PDF: ${e.message}`);
                    }
                }
            }

            doc.fontSize(7).fillColor(BLACK)
                .text('PRESIDENCIA DEL ESTADO', margin + (user.imagen ? 60 : 0), 30, { width: 80, align: 'center' })
                .text('PLURINACIONAL DE BOLIVIA', margin + (user.imagen ? 60 : 0), 38, { width: 80, align: 'center' });

            doc.fontSize(20).fillColor(DARK_RED)
                .text('UGPSEP-SI', 0, 28, { align: 'center' });
            doc.fontSize(7).fillColor(BLACK)
                .text('UNIDAD DE GESTIÓN DE PERSONAL', 0, 52, { align: 'center' })
                .text('DEL SEP Y SISTEMAS INFORMÁTICOS', 0, 61, { align: 'center' });

            // QR esquina superior derecha
            const qrX = pageW - margin - 70;
            const qrY = 25;
            if (evaluation.qrCode) {
                doc.image(evaluation.qrCode, qrX, qrY, { width: 65 });
            }
            doc.fontSize(7).fillColor(BLACK)
                .text('Código de verificación:', qrX - 5, qrY + 67, { width: 80, align: 'center' });
            doc.fontSize(11).fillColor(RED)
                .text(evaluation.codigoVerificacion, qrX - 5, qrY + 77, { width: 80, align: 'center' });
            doc.fontSize(9).fillColor(BLACK)
                .text('SIE: 00000999', qrX - 5, qrY + 90, { width: 80, align: 'center' });

            // Línea roja separadora
            doc.moveTo(margin, 100).lineTo(pageW - margin, 100).lineWidth(2).strokeColor(RED).stroke();

            // MINISTERIO DE EDUCACIÓN
            doc.fontSize(8).fillColor(RED)
                .text('MINISTERIO', margin, 105, { width: 70, align: 'center' })
                .text('DE EDUCACIÓN', margin, 114, { width: 70, align: 'center' });

            // ── TÍTULO PRINCIPAL ──────────────────────────────────
            doc.fontSize(22).fillColor(BLACK)
                .text('HOJA DE CONCEPTO', 0, 108, { align: 'center', characterSpacing: 1 });

            doc.moveTo(margin + 80, 135)
                .lineTo(pageW - margin - 80, 135)
                .lineWidth(1.5).strokeColor(RED).stroke();

            const periodo = evaluation.periodoEval;
            doc.fontSize(11).fillColor(BLACK)
                .text('ESFM TECNOLOGICO Y HUMANISTICO EL ALTO', 0, 142, { align: 'center' })
                .text('- LA PAZ - BOLIVIA -', 0, 156, { align: 'center' })
                .text(`CORRESPONDIENTE A LA ${(periodo?.periodo || '').toUpperCase()}`, 0, 170, { align: 'center' });

            // ── CUERPO ────────────────────────────────────────────
            const nombreCompleto = `${user.nombre || ''} ${user.apellidos || ''}`.trim() || 'Personal Sin Nombre';
            const ci = user.ci ? String(user.ci) : (user.username || 'N/A');
            const cargoNombre = evaluation.cargo?.nombre || 'Personal';

            doc.fontSize(10).fillColor(BLACK);
            doc.text(
                `El/La Señor(a) ${nombreCompleto}, como autoridad de la institución educativa ESFM TECNOLOGICO Y HUMANISTICO EL ALTO con SIE/RUE: 00000999, en uso de sus legitimas funciones y atribuciones, confiere la presente Hoja de Concepto a petición del interesado.`,
                margin, 200,
                { width: contentW, align: 'justify', lineGap: 2 },
            );
            doc.moveDown(0.8);
            doc.text(
                `Indicando que la persona: ${nombreCompleto}, con C.I. N° ${ci}, RDA 7389694, perteneciente a la institución educativa: ESFM TECNOLOGICO Y HUMANISTICO EL ALTO, con relación a condiciones personales hasta la presente gestión ${periodo?.gestion || ''}. Según el REGLAMENTO DEL ESCALAFÓN NACIONAL DE LA EDUCACIÓN BOLIVIANA, Decreto N° 04688 CAP. V. Art. 26. Sobre CONDICIONES PERSONALES, alcanza las siguientes calificaciones.`,
                { width: contentW, align: 'justify', lineGap: 2 },
            );
            doc.moveDown(1.2);

            // ── TABLA ─────────────────────────────────────────────
            const tableTop = doc.y;
            const colNum = margin;
            const colCrit = margin + 20;
            const colVal = pageW - margin - 120;
            const colPunt = pageW - margin - 50;
            const tableRight = pageW - margin;

            doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
                .text('Criterios', colCrit + 60, tableTop, { width: 220, align: 'center' })
                .text('Valoración', colVal, tableTop, { width: 70, align: 'center' })
                .text('Puntaje', colPunt, tableTop, { width: 50, align: 'center' });
            doc.font('Helvetica');

            const headerLineY = tableTop + 16;
            doc.moveTo(colCrit, headerLineY)
                .lineTo(tableRight, headerLineY)
                .lineWidth(1).strokeColor(BLACK).stroke();

            // Mapear puntajes por criterioId
            const puntajesMap: Record<string, number> = {};
            for (const p of (evaluation.puntajes || []) as any[]) {
                puntajesMap[p.criterioId] = p.puntaje;
            }

            let rowY = headerLineY + 6;
            const criterios = (periodo?.criterios || []) as any[];
            let rowNum = 1;

            for (const criterio of criterios) {
                const puntaje = puntajesMap[criterio.id] ?? 0;
                const valoracion = `0 a ${criterio.puntajeMaximo}`;
                const textHeight = doc.heightOfString(criterio.nombre, {
                    width: colVal - colCrit - 12,
                });
                const rowH = Math.max(textHeight + 10, 24);

                // Borde rojo alrededor del nombre del criterio
                doc.rect(colCrit, rowY, colVal - colCrit - 4, rowH)
                    .lineWidth(0.5).strokeColor(RED).stroke();

                doc.fontSize(9).fillColor(BLACK)
                    .text(`${rowNum}.`, colNum, rowY + 5, { width: 18, align: 'right' });
                doc.text(criterio.nombre, colCrit + 4, rowY + 5, {
                    width: colVal - colCrit - 12,
                    align: 'left',
                    lineGap: 1,
                });
                doc.text(valoracion, colVal, rowY + 5, { width: 70, align: 'center' });
                doc.text(String(puntaje), colPunt, rowY + 5, { width: 50, align: 'center' });

                rowY += rowH + 3;
                rowNum++;
            }

            doc.moveTo(colCrit, rowY)
                .lineTo(tableRight, rowY)
                .lineWidth(1).strokeColor(BLACK).stroke();

            // ── FECHA Y TOTAL ─────────────────────────────────────
            rowY += 14;
            const dateStr = new Date().toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
            doc.fontSize(10).fillColor(BLACK).text(dateStr, margin, rowY);
            doc.font('Helvetica-Bold')
                .text('CALIFICACIÓN TOTAL:', colVal - 20, rowY, { continued: true })
                .text(`   ${evaluation.puntajeTotal}`);
            doc.font('Helvetica');

            // ── CIERRE ────────────────────────────────────────────
            doc.moveDown(2);
            doc.fontSize(10).fillColor(BLACK).text(
                'Es cuanto certifico en cumplimiento a la CPE, Ley N° 070 de Educación y normativa vigente que rige la Educación Boliviana.',
                margin,
                doc.y,
                { width: contentW, align: 'justify' },
            );

            // ── FOOTER ────────────────────────────────────────────
            doc.fontSize(11).fillColor(BLACK)
                .text('2025 BICENTENARIO DE BOLIVIA', 0, pageH - 60, { align: 'center' });
            doc.rect(0, pageH - 38, pageW, 38).fill(BLACK);
            doc.fontSize(7).fillColor('#FFFFFF').text(
                'NOTA: El presente documento quedará invalidado en caso de tener raspaduras, enmiendas, sobreescritos y/o la falta de firmas de autoridades competentes.',
                margin,
                pageH - 26,
                { width: contentW, align: 'center' },
            );

            doc.end();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    private async generateVerificationCode(): Promise<string> {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const exists = await this.db.evaluacionAdmins.findFirst({
            where: { codigoVerificacion: result },
        });
        if (exists) return this.generateVerificationCode();
        return result;
    }
}
