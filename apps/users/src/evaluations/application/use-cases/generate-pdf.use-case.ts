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
  ) { }

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
      const margin = 40;
      const contentW = pageW - margin * 2;

      const BLACK = '#000000';
      const GRAY_BG = '#E5E7EB';
      const GOLD = '#946E23';

      // 1. Logo Institucional
      const possibleLogoPaths = [
        path.join(process.cwd(), 'uploads/logo-principal.png'),
        path.join(process.cwd(), '../frontend/public/logo-principal.png'),
        path.join(__dirname, '../../../../../../../frontend/public/logo-principal.png'),
      ];
      const logoPath = possibleLogoPaths.find((p) => fs.existsSync(p)) || '';
      if (logoPath) {
        try {
          doc.image(logoPath, margin, 25, { width: 145 });
        } catch (e) {
          this.logger.error(`Error logo: ${e.message}`);
        }
      } else {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(GOLD).text('MINISTERIO', margin, 25);
        doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK).text('DE EDUCACIÓN', margin, 38);
      }

      // 2. Título
      doc.y = 80;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(BLACK).text(
        'EVALUACIÓN DE DESEMPEÑO PROFESIONAL DEL PERSONAL DE LAS ESCUELAS',
        margin,
        doc.y,
        { width: contentW, align: 'center' }
      );
      doc.text(
        'SUPERIORES DE FORMACIÓN DE MAESTRAS Y MAESTROS Y SUS UNIDADES ACADÉMICAS',
        margin,
        doc.y + 2,
        { width: contentW, align: 'center' }
      );
      doc.text(
        `GESTIÓN ${periodo?.gestion || '2026'} - ${(periodo?.periodo || '1RA. FASE').toUpperCase()}`,
        margin,
        doc.y + 3,
        { width: contentW, align: 'center' }
      );

      // 3. Cuadro de Datos
      const tableY = doc.y + 12;
      const col1W = 105;
      const col2W = 195;
      const col3W = 45;
      const col4W = 75;
      const col5W = 55;
      const col6W = 57;
      const rowH = 17;

      const drawBox = (x: number, y: number, w: number, h: number, isHeader: boolean, text: string) => {
        if (isHeader) {
          doc.rect(x, y, w, h).fillAndStroke(GRAY_BG, BLACK);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text(text, x + 4, y + 5, { width: w - 8, align: 'right' });
        } else {
          doc.rect(x, y, w, h).stroke(BLACK);
          doc.font('Helvetica').fontSize(8).fillColor(BLACK).text(text, x + 5, y + 5, { width: w - 10 });
        }
      };

      const nombreCompleto = `${user.apellidos || ''} ${user.nombre || ''}`.trim() || '---';
      const ciVal = `${user.ci || ''}`.trim() || '---';
      const deptoVal = (user.departamento || 'TARIJA').toUpperCase();
      const codVal = evaluation.codigoVerificacion || `601-${ciVal}`;
      const esfmVal = ((user as any).sedes?.[0]?.sede?.nombre || 'NACIONAL').toUpperCase();
      const cargoVal = (evaluation.cargo?.nombre || user.cargoStr || 'DOCENTE').toUpperCase();

      // Fila 1
      drawBox(margin, tableY, col1W, rowH, true, 'Apellidos y Nombres:');
      drawBox(margin + col1W, tableY, col2W, rowH, false, nombreCompleto);
      drawBox(margin + col1W + col2W, tableY, col3W, rowH, true, 'C.I.:');
      drawBox(margin + col1W + col2W + col3W, tableY, col4W, rowH, false, ciVal);
      drawBox(margin + col1W + col2W + col3W + col4W, tableY, col5W, rowH, true, 'Expedido:');
      drawBox(margin + col1W + col2W + col3W + col4W + col5W, tableY, col6W, rowH, false, deptoVal.slice(0, 2));

      // Fila 2
      drawBox(margin, tableY + rowH, col1W, rowH, true, 'Departamento:');
      drawBox(margin + col1W, tableY + rowH, col2W, rowH, false, deptoVal);
      drawBox(margin + col1W + col2W, tableY + rowH, col3W, rowH, true, 'Código:');
      drawBox(margin + col1W + col2W + col3W, tableY + rowH, col4W + col5W + col6W, rowH, false, codVal);

      // Fila 3
      drawBox(margin, tableY + rowH * 2, col1W, rowH, true, 'ESFM/UA:');
      drawBox(margin + col1W, tableY + rowH * 2, contentW - col1W, rowH, false, esfmVal);

      // Fila 4
      drawBox(margin, tableY + rowH * 3, col1W, rowH, true, 'Cargo:');
      drawBox(margin + col1W, tableY + rowH * 3, contentW - col1W, rowH, false, cargoVal);

      // 4. Texto Legal
      doc.y = tableY + rowH * 4 + 10;
      doc.font('Helvetica').fontSize(7.5).fillColor(BLACK);
      const resolucion = `La Dirección General de Formación de Maestros dependiente del Viceministerio de Educación Superior de Formación Profesional del Ministerio de Educación, desarrolló el proceso de Evaluación de Desempeño Profesional del Personal de las ESFM/UA, Gestión ${periodo?.gestion || '2026'} - ${periodo?.periodo || 'Primera Fase'}, en la cual se evaluó el cumplimiento de funciones profesionales para el desarrollo de una gestión académica e institucional acorde a los lineamientos, objetivos, principios del Modelo Educativo Sociocomunitario Productivo, en el marco de la Ley Nº 070 de la Educación "Avelino Siñani – Elizardo Pérez", Art. 53 y 57 del Reglamento General de las Escuelas Superiores de Formación de Maestras y Maestros/Unidades Académicas, aprobado mediante Resolución Ministerial Nº 2938/2017 de fecha 22 de diciembre de 2017 y Manual de Organización de Funciones de las ESFM/UA, aprobado con la Resolución Ministerial Nº 2726/2017 de fecha 20 de octubre de 2017.`;
      doc.text(resolucion, margin, doc.y, { width: contentW, align: 'justify' });

      // 5. Parámetros de Rendimiento
      doc.y += 10;
      doc.font('Helvetica').fontSize(8).fillColor(BLACK).text('Los parámetros de rendimiento son:', margin, doc.y);
      const escalaY = doc.y + 4;
      const escalaColW = contentW / 4;
      const escalas = [
        { label: 'Destacado', range: '91 – 100 puntos' },
        { label: 'Bueno', range: '81 – 90 puntos' },
        { label: 'Aceptable', range: '61 – 80 puntos' },
        { label: 'Insuficiente', range: '1 – 60 puntos' },
      ];
      escalas.forEach((esc, i) => {
        const x = margin + i * escalaColW;
        doc.rect(x, escalaY, escalaColW, 14).fillAndStroke(GRAY_BG, BLACK);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(BLACK).text(esc.label, x, escalaY + 3, { width: escalaColW, align: 'center' });
        doc.rect(x, escalaY + 14, escalaColW, 14).stroke(BLACK);
        doc.font('Helvetica').fontSize(7.5).fillColor(BLACK).text(esc.range, x, escalaY + 17, { width: escalaColW, align: 'center' });
      });

      // 6. Formularios Aplicados
      doc.y = escalaY + 36;
      doc.font('Helvetica').fontSize(8).fillColor(BLACK).text(
        'El resultado obtenido por su persona en los formularios aplicados, es el siguiente:',
        margin,
        doc.y
      );

      const formsTableY = doc.y + 4;
      const fCol1 = 30;
      const fCol3 = contentW - 120; // Formulario Aplicado (absorbe el antiguo fCol2)
      const fCol4 = 40;
      const fCol5 = 50;

      let curFormY = formsTableY;
      // Header
      let hX = margin;
      [
        { t: 'No.', w: fCol1 },
        { t: 'Formulario Aplicado', w: fCol3, align: 'left' },
        { t: '%', w: fCol4 },
        { t: 'Resultado', w: fCol5 }
      ].forEach((col) => {
        doc.rect(hX, curFormY, col.w, 16).fillAndStroke(GRAY_BG, BLACK);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text(col.t, hX + 2, curFormY + 4, {
          width: col.w - 4,
          align: (col.align as any) || 'center'
        });
        hX += col.w;
      });
      curFormY += 16;

      // Filas
      const forms = [
        { no: '1', nom: 'Evaluación del inmediato superior y dependientes.', peso: '15%', res: evaluation.tipoEvaluacion === 'SUPERVISOR' ? `${Math.round((Number(evaluation.puntajeFinal ?? 0) * 15) / 100 * 10) / 10}` : '-' },
        { no: '2', nom: 'Evaluación de Factores Asociados al Desempeño Profesional del Personal del PROFE.', peso: '30%', res: evaluation.tipoEvaluacion === 'AUTOEVALUACION' ? `${Math.round((Number(evaluation.puntajeFinal ?? 0) * 30) / 100 * 10) / 10}` : '-' },
        { no: '3', nom: 'Evaluación comunitaria.', peso: '10%', res: evaluation.tipoEvaluacion === 'PAR' ? `${Math.round((Number(evaluation.puntajeFinal ?? 0) * 10) / 100 * 10) / 10}` : '-' },
        { no: '4', nom: 'Recolección y verificación de evidencias.', peso: '45%', res: evaluation.tipoEvaluacion === 'SUPERVISOR' ? '-' : '-' },
      ];

      forms.forEach((fm) => {
        let rX = margin;
        [
          { t: fm.no, w: fCol1, align: 'center' },
          { t: fm.nom, w: fCol3, align: 'left' },
          { t: fm.peso, w: fCol4, align: 'center' },
          { t: fm.res, w: fCol5, align: 'center', bold: true }
        ].forEach((col) => {
          doc.rect(rX, curFormY, col.w, 16).stroke(BLACK);
          doc.font(col.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(BLACK).text(col.t, rX + 4, curFormY + 4, {
            width: col.w - 8,
            align: col.align as any
          });
          rX += col.w;
        });
        curFormY += 16;
      });

      // Calificación Cualitativa
      const score = Number(evaluation.puntajeFinal) || 0;
      let calif = 'INSUFICIENTE';
      if (score >= 91) calif = 'DESTACADO';
      else if (score >= 81) calif = 'BUENO';
      else if (score >= 61) calif = 'ACEPTABLE';

      // Fila Total
      let tX = margin;
      const totalW = fCol1 + fCol3;
      doc.rect(tX, curFormY, totalW, 16).stroke(BLACK);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text('RESULTADO Y CALIFICACIÓN TOTAL:', tX + 4, curFormY + 4);
      tX += totalW;

      doc.rect(tX, curFormY, fCol4, 16).stroke(BLACK);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text('100%', tX, curFormY + 4, { width: fCol4, align: 'center' });
      tX += fCol4;

      doc.rect(tX, curFormY, fCol5, 16).stroke(BLACK);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text(`${score}`, tX, curFormY + 4, { width: fCol5, align: 'center' });
      curFormY += 22;

      // 7. Texto resultado
      doc.y = curFormY;
      doc.font('Helvetica').fontSize(8.5).fillColor(BLACK).text('De acuerdo a la valoración realizada en la Evaluación de Desempeño su calificación es: ', margin, doc.y, { continued: true });
      doc.font('Helvetica-Bold').text(calif);

      // 8. QR y firma
      const bottomY = 660;
      if (freshQrCode) {
        doc.image(freshQrCode, margin, bottomY, { width: 70 });
      }
      doc.fontSize(6.5).font('Helvetica').fillColor(BLACK).text(
        'Por favor, valide que el QR corresponde a los resultados de la hoja oficial de evaluación firmada.',
        margin,
        bottomY + 75,
        { width: 120 }
      );

      const signX = pageW - margin - 200;
      const lineY = bottomY + 50;
      doc.moveTo(signX, lineY).lineTo(signX + 180, lineY).lineWidth(0.8).strokeColor(BLACK).stroke();
      doc.fontSize(8).font('Helvetica').fillColor(BLACK).text('Recibido', signX, lineY + 5, { width: 180, align: 'center' });
      doc.fontSize(8.5).font('Helvetica-Bold').text(nombreCompleto.toUpperCase(), signX, lineY + 16, { width: 180, align: 'center' });

      // 9. Footer
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#555555').text(
        'En señal de aceptación de los resultados descritos, la parte evaluada ratifica este documento con su firma.',
        margin,
        760,
        { width: contentW, align: 'center' }
      );

      doc.end();
    });
  }
}
