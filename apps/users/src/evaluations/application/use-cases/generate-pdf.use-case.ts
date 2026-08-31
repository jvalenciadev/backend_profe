import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { GetAsignacionByIdUseCase } from './asignacion.use-cases';

@Injectable()
export class GeneratePDFUseCase {
  private readonly logger = new Logger(GeneratePDFUseCase.name);

  constructor(
    private readonly getAsignacionByIdUseCase: GetAsignacionByIdUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(id: string): Promise<Buffer> {
    const evaluation = await this.getAsignacionByIdUseCase.execute(id);

    const frontendUrl =
      this.configService.get('FRONTEND_URL') ||
      'https://aulaprofe.minedu.gob.bo';
    const qrUrl = `${frontendUrl}/verificar-evaluacion?code=${evaluation.codigoVerificacion || evaluation.id}`;
    const freshQrCode = await QRCode.toDataURL(qrUrl).catch(
      () => evaluation.qrCode,
    );

    const user = evaluation.evaluado || {};
    const evaluador = evaluation.evaluador || {};
    const periodo = evaluation.periodo;
    const cuestionario = evaluation.cuestionario;

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
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(evaluation.codigoVerificacion || evaluation.id.slice(0, 8), qrX - 5, qrY + 77, {
          width: 80,
          align: 'center',
        });
      doc.font('Helvetica');

      // Title
      doc.y = 110;
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(RED)
        .text('HOJA DE CONCEPTO Y EVALUACIÓN DE DESEMPEÑO', margin, doc.y, {
          width: contentW,
          align: 'center',
        });
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(BLACK)
        .text(`GESTIÓN ${periodo?.gestion || '2026'}`, margin, doc.y + 4, {
          width: contentW,
          align: 'center',
        });

      // Data Block
      doc.moveDown(1.5);
      const startInfoY = doc.y;
      const col1X = margin;
      const col2X = margin + 110;

      const addRow = (label: string, value: string, yPos: number) => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK).text(label, col1X, yPos);
        doc.font('Helvetica').text(value || '-', col2X, yPos, { width: contentW - 110 });
      };

      let currY = startInfoY;
      addRow('EVALUADO:', `${user.nombre || ''} ${user.apellidos || ''}`.trim(), currY);
      currY += 16;
      addRow('CARGO:', evaluation.cargo?.nombre || user.cargoStr || 'Personal Administrativo/Técnico', currY);
      currY += 16;
      addRow('EVALUADOR:', `${evaluador.nombre || ''} ${evaluador.apellidos || ''}`.trim(), currY);
      currY += 16;
      addRow('CUESTIONARIO:', cuestionario?.titulo || 'Evaluación de Desempeño', currY);
      currY += 16;

      doc.y = currY + 10;

      // Table Header
      const tableTop = doc.y;
      const colNum = margin;
      const colCrit = margin + 25;
      const colVal = pageW - margin - 140;
      const colPunt = pageW - margin - 60;
      const tableRight = pageW - margin;

      doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK);
      doc.text('N°', colNum, tableTop, { width: 20, align: 'center' });
      doc.text('CRITERIO / INDICADOR DE EVALUACIÓN', colCrit, tableTop);
      doc.text('ESCALA', colVal, tableTop, { width: 70, align: 'center' });
      doc.text('PUNTAJE', colPunt, tableTop, { width: 60, align: 'center' });

      const headerLineY = tableTop + 16;
      doc.moveTo(colCrit, headerLineY).lineTo(tableRight, headerLineY).lineWidth(1).strokeColor(BLACK).stroke();

      let rowY = headerLineY + 6;
      let rowNum = 1;

      const criterios = periodo?.criterios || (cuestionario?.criterio ? [cuestionario.criterio] : []);

      for (const crit of criterios) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK);
        doc.text(`${rowNum}. ${crit.nombre}`, colCrit, rowY, { width: colVal - colCrit - 10 });
        rowY += 14;

        for (const sub of crit.subcriterios || []) {
          doc.fontSize(8).font('Helvetica').fillColor(BLACK);
          doc.text(`• ${sub.indicador}`, colCrit + 10, rowY, { width: colVal - colCrit - 20 });
          rowY += 14;
        }
        rowNum++;
      }

      doc.moveTo(colCrit, rowY).lineTo(tableRight, rowY).lineWidth(1).strokeColor(BLACK).stroke();

      // Total & Score
      rowY += 14;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(BLACK);
      doc.text('CALIFICACIÓN TOTAL / PROMEDIO:', colVal - 80, rowY);
      doc.fillColor(RED).text(`${evaluation.puntajeFinal ?? 0} / 100`, colPunt, rowY, { width: 60, align: 'center' });

      doc.end();
    });
  }
}
