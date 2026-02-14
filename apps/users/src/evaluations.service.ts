import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, GenericCrudService } from '@app/database';
import * as QRCode from 'qrcode';
import * as PDFDocument from 'pdfkit';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class EvaluationsService extends GenericCrudService<any> {
    constructor(private readonly prismaService: PrismaService) {
        super(prismaService, 'evaluacionAdmins', true, true);
    }

    async generateQR(text: string): Promise<string> {
        return await QRCode.toDataURL(text);
    }

    async generateVerificationCode(): Promise<string> {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Ensure uniqueness
        const exists = await this.prismaService.evaluacionAdmins.findUnique({
            where: { codigoVerificacion: result }
        });
        if (exists) return this.generateVerificationCode();
        return result;
    }

    async createEvaluation(data: any) {
        const codigoVerificacion = await this.generateVerificationCode();
        const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/evaluations/verify/${codigoVerificacion}`;
        const qrCode = await this.generateQR(verificationUrl);

        return this.prismaService.evaluacionAdmins.create({
            data: {
                ...data,
                codigoVerificacion,
                qrCode,
                puntajeTotal: Object.values(data.criterios).reduce((a: any, b: any) => a + (Number(b) || 0), 0) as number
            },
            include: {
                user: true
            }
        });
    }

    async generatePDF(id: string): Promise<Buffer> {
        const evaluation = await this.prismaService.evaluacionAdmins.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!evaluation) throw new NotFoundException('Evaluación no encontrada');

        return new Promise((resolve, reject) => {
            const doc = new (PDFDocument as any)({ margin: 50, size: 'LETTER' });
            const chunks: any[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- Header ---
            // doc.image(join(process.cwd(), 'uploads/global/logo_minedu.png'), 50, 45, { width: 100 });
            doc.fontSize(16).text('UGPSEP-SI', { align: 'center' });
            doc.fontSize(8).text('UNIDAD DE GESTIÓN DE PERSONAL\nDEL SEP Y SISTEMAS INFORMÁTICOS', { align: 'center' });
            doc.moveDown();
            doc.fontSize(18).text('HOJA DE CONCEPTO', { align: 'center', characterSpacing: 2 });
            doc.moveDown(0.5);
            doc.fontSize(12).text('ESFM TECNOLOGICO Y HUMANISTICO EL ALTO', { align: 'center' });
            doc.text('- LA PAZ - BOLIVIA -', { align: 'center' });
            doc.text(`CORRESPONDIENTE A LA ${evaluation.periodo.toUpperCase()}`, { align: 'center' });

            // Verification Code Table (Top Right)
            const qrSize = 60;
            doc.image(evaluation.qrCode, 480, 40, { width: qrSize });
            doc.fontSize(8).text('Código de verificación:', 470, 40 + qrSize + 5, { width: 80, align: 'center' });
            doc.fontSize(10).fillColor('red').text(evaluation.codigoVerificacion, 470, 40 + qrSize + 15, { width: 80, align: 'center' });
            doc.fillColor('black');

            doc.moveDown(2);

            // --- Content ---
            const user = evaluation.user;
            const fullText = `El/La Señor(a) ${user.nombre} ${user.apellidos}, como autoridad de la institución educativa ESFM TECNOLOGICO Y HUMANISTICO EL ALTO con SIE/RUE: 00000999, en uso de sus legitimas funciones y atribuciones, confiere la presente Hoja de Concepto a petición del interesado.\n\n` +
                `Indicando que la persona: ${user.nombre} ${user.apellidos}, con C.I. N° ${user.username || 'N/A'}, RDA 7389694, perteneciente a la institución educativa: ESFM TECNOLOGICO Y HUMANISTICO EL ALTO, con relación a condiciones personales hasta la presente ${evaluation.gestion}. Según el REGLAMENTO DEL ESCALAFÓN NACIONAL DE LA EDUCACIÓN BOLIVIANA, Decreto N° 04688 CAP. V. Art. 26. Sobre CONDICIONES PERSONALES, alcanza las siguientes calificaciones.`;

            doc.fontSize(10).text(fullText, { align: 'justify', lineGap: 3 });

            doc.moveDown(2);

            // --- Table ---
            const tableTop = doc.y;
            const col1 = 50, col2 = 150, col3 = 400, col4 = 500;

            doc.fontSize(10).text('Criterios', col2, tableTop, { bold: true });
            doc.text('Valoración', col3, tableTop);
            doc.text('Puntaje', col4, tableTop);

            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            const criterios: any = evaluation.criterios;
            let currentY = tableTop + 25;

            const criteriaList = [
                { key: 'asistencia', label: 'Asistencia, puntualidad y disciplina en cumplimiento de los deberes docentes' },
                { key: 'rasgos', label: 'Rasgos positivos de personalidad y carácter, simpatía y cordialidad en sus relaciones profesionales' },
                { key: 'ascendencia', label: 'Ascendencia moral y disposición de ánimo estimulante para los estudiantes.' },
                { key: 'interes', label: 'Interés por perfeccionar su preparación técnica y cultural' },
                { key: 'iniciativa', label: 'Iniciativa en beneficio del mejoramiento de la educación' }
            ];

            criteriaList.forEach((item, index) => {
                doc.fontSize(9).text(`${index + 1}.`, col1, currentY);
                doc.text(item.label, col2, currentY, { width: 230 });
                doc.text('0 a 10', col3, currentY);
                doc.text(criterios[item.key] || '0', col4, currentY);
                currentY += 30;
                doc.moveTo(col2, currentY - 5).lineTo(550, currentY - 5).stroke();
            });

            doc.moveDown();
            const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.fontSize(10).text(dateStr, col1, doc.y + 10);
            doc.fontSize(11).text(`CALIFICACIÓN TOTAL:   ${evaluation.puntajeTotal}`, 400, doc.y, { bold: true });

            doc.moveDown(3);
            doc.fontSize(10).text('Es cuanto certifico en cumplimiento a la CPE, Ley N° 070 de Educación y normativa vigente que rige la Educación Boliviana.', { align: 'justify' });

            // --- Footer ---
            doc.fontSize(12).text('2025 BICENTENARIO DE BOLIVIA', 50, doc.page.height - 80, { align: 'center', bold: true });
            doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill('black');
            doc.fillColor('white').fontSize(8).text('NOTA: El presente documento quedará invalidado en caso de tener raspaduras, enmiendas, sobreescritos y/o la falta de firmas de autoridades competentes.', 50, doc.page.height - 40, { align: 'center' });

            doc.end();
        });
    }

    async getAdminsByRole(roleName: string) {
        return this.prismaService.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: roleName
                        }
                    }
                },
                estado: 'ACTIVO'
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
    }
}
