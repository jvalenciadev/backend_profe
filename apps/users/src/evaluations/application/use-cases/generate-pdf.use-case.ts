import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { GetEvaluacionByIdUseCase } from './evaluacion.use-cases';

@Injectable()
export class GeneratePDFUseCase {
  private readonly logger = new Logger(GeneratePDFUseCase.name);

  constructor(
    private readonly getEvaluacionByIdUseCase: GetEvaluacionByIdUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(id: string): Promise<Buffer> {
    const evaluation = await this.getEvaluacionByIdUseCase.execute(id);

    const frontendUrl =
      this.configService.get('FRONTEND_URL') ||
      'https://aulaprofe.minedu.gob.bo';
    const qrUrl = `${frontendUrl}/verificar-evaluacion?code=${evaluation.codigoVerificacion}`;
    const freshQrCode = await QRCode.toDataURL(qrUrl).catch(
      () => evaluation.qrCode,
    );

    const user = (evaluation as any).user || {};
    const creator = (evaluation as any).creator;
    const creatorName = creator
      ? `${creator.nombre} ${creator.apellidos}`
      : 'Jhery Waldo Pinto Claro';
    const isResponsable = creator?.roles?.some((r: any) =>
      r.role.name.includes('RESPONSABLE'),
    );
    const creatorRole = isResponsable
      ? 'Responsable Departamental'
      : 'Autoridad Nacional';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 0,
        size: 'LETTER',
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const margin = 50;
      const contentW = pageW - margin * 2;

      const RED = '#C0392B';
      const BLACK = '#000000';

      // Background
      const possibleBgPaths = [
        path.join(process.cwd(), 'apps/users/src/assets/fondo_doc.jpg'),
        path.join(process.cwd(), 'dist/apps/users/src/assets/fondo_doc.jpg'),
        path.join(__dirname, '../../../assets/fondo_doc.jpg'),
        path.join(process.cwd(), 'uploads/fondo_doc.jpg'),
      ];
      const bgPath = possibleBgPaths.find((p) => fs.existsSync(p)) || '';
      if (bgPath) {
        try {
          doc.save();
          doc.image(bgPath, 0, 0, { width: 612, height: 792 });
          doc.restore();
        } catch (e) {
          this.logger.error(`Error fondo_doc: ${e.message}`);
        }
      }

      // User photo
      if (user.imagen) {
        const imgPath = path.join(process.cwd(), user.imagen);
        if (fs.existsSync(imgPath)) {
          try {
            doc.image(imgPath, margin, 25, { width: 55, height: 65 });
          } catch (e) {
            this.logger.error(`Error imagen usuario: ${e.message}`);
          }
        }
      }

      // QR
      const qrX = pageW - margin - 70;
      const qrY = 25;
      if (freshQrCode) doc.image(freshQrCode, qrX, qrY, { width: 65 });
      doc
        .fontSize(7)
        .fillColor(BLACK)
        .text('Código de verificación:', qrX - 5, qrY + 67, {
          width: 80,
          align: 'center',
        });
      doc
        .fontSize(11)
        .fillColor(RED)
        .text(evaluation.codigoVerificacion, qrX - 5, qrY + 77, {
          width: 80,
          align: 'center',
        });

      // Separator line
      doc
        .moveTo(margin, 100)
        .lineTo(pageW - margin, 100)
        .lineWidth(2)
        .strokeColor(RED)
        .stroke();

      const periodo = (evaluation as any).periodoEval;

      // Title
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(BLACK)
        .text('HOJA DE CONCEPTO', 0, 130, { align: 'center' });
      doc
        .fontSize(12)
        .text(
          `CORRESPONDIENTE A LA GESTIÓN ${periodo?.gestion || '2025'}`,
          0,
          150,
          { align: 'center' },
        );

      // Body
      const nombreCompleto =
        `${user.nombre || ''} ${user.apellidos || ''}`.trim() ||
        'Personal Sin Nombre';
      const ci = user.ci ? String(user.ci) : user.username || 'N/A';

      doc.fontSize(10).fillColor(BLACK).font('Helvetica');
      doc.text(
        `El/La Señor(a) ${creatorName}, en su calidad de ${creatorRole} del Programa de Formación Especializada – PROFE, dependiente del Instituto de Investigaciones Pedagógicas Plurinacional del Ministerio de Educación, y en ejercicio de sus legítimas funciones y atribuciones, extiende la presente Hoja de Concepto a solicitud del interesado.`,
        margin,
        200,
        { width: contentW, align: 'justify', lineGap: 2 },
      );
      doc.moveDown(0.8);
      const sedeNombre = user.sedes?.[0]?.sede?.nombre || 'Sede no definida';
      doc.text(
        `Se deja constancia que el señor ${nombreCompleto}, con Cédula de Identidad N.° ${ci}, RDA N.° ${user.username || '---'}, perteneciente a la ${sedeNombre}.`,
        { width: contentW, align: 'justify', lineGap: 2 },
      );
      doc.moveDown(0.8);
      doc.text(
        `En ese marco, y en lo referido a las Condiciones Personales, de conformidad con lo establecido en el Reglamento del Escalafón Nacional de la Educación Boliviana, Decreto Supremo N.° 04688, Capítulo V, Artículo 26, el mencionado servidor alcanza las siguientes calificaciones:`,
        { width: contentW, align: 'justify', lineGap: 2 },
      );
      doc.moveDown(1.2);

      // Table
      const tableTop = doc.y;
      const colNum = margin;
      const colCrit = margin + 20;
      const colVal = pageW - margin - 120;
      const colPunt = pageW - margin - 50;
      const tableRight = pageW - margin;

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(BLACK)
        .text('Criterios', colCrit + 60, tableTop, {
          width: 220,
          align: 'center',
        })
        .text('Valoración', colVal, tableTop, { width: 70, align: 'center' })
        .text('Puntaje', colPunt, tableTop, { width: 50, align: 'center' });
      doc.font('Helvetica');

      const headerLineY = tableTop + 16;
      doc
        .moveTo(colCrit, headerLineY)
        .lineTo(tableRight, headerLineY)
        .lineWidth(1)
        .strokeColor(BLACK)
        .stroke();

      const puntajesMap: Record<string, number> = {};
      for (const p of ((evaluation as any).puntajes || []) as any[]) {
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

        doc
          .rect(colCrit, rowY, colVal - colCrit - 4, rowH)
          .lineWidth(0.5)
          .strokeColor(RED)
          .stroke();
        doc
          .fontSize(9)
          .fillColor(BLACK)
          .text(`${rowNum}.`, colNum, rowY + 5, { width: 18, align: 'right' });
        doc.text(criterio.nombre, colCrit + 4, rowY + 5, {
          width: colVal - colCrit - 12,
          align: 'left',
          lineGap: 1,
        });
        doc.text(valoracion, colVal, rowY + 5, { width: 70, align: 'center' });
        doc.text(String(puntaje), colPunt, rowY + 5, {
          width: 50,
          align: 'center',
        });
        rowY += rowH + 3;
        rowNum++;
      }

      doc
        .moveTo(colCrit, rowY)
        .lineTo(tableRight, rowY)
        .lineWidth(1)
        .strokeColor(BLACK)
        .stroke();

      // Total & date
      rowY += 14;
      doc
        .fontSize(10)
        .fillColor(BLACK)
        .text(`31 de diciembre de ${periodo?.gestion || '2025'}`, margin, rowY);
      doc
        .font('Helvetica-Bold')
        .text('CALIFICACIÓN TOTAL:', colVal - 20, rowY, { continued: true })
        .text(`   ${evaluation.puntajeTotal}`);
      doc.font('Helvetica');

      doc.moveDown(2);
      doc
        .fontSize(10)
        .fillColor(BLACK)
        .text(
          'Es cuanto certifico en cumplimiento a la CPE, Ley N° 070 de Educación y normativa vigente que rige la Educación Boliviana.',
          margin,
          doc.y,
          { width: contentW, align: 'justify' },
        );

      // Footer
      doc.rect(0, pageH - 30, pageW, 30).fill(BLACK);
      doc
        .fontSize(7)
        .fillColor('#FFFFFF')
        .text(
          'NOTA: El presente documento quedará invalidado en caso de tener raspaduras, enmiendas, sobreescritos y/o la falta de firmas de autoridades competentes.',
          margin,
          pageH - 20,
          { width: contentW, align: 'center' },
        );

      doc.end();
    });
  }
}
