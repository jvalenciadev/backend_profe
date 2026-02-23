import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  Logger,
  Res,
  Patch,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { JwtAuthGuard, Public } from '@app/common';

@Controller('evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
  private readonly logger = new Logger(EvaluationsController.name);
  constructor(private readonly evaluationsService: EvaluationsService) { }

  // ─────────────────────────────────────────────────────────────
  // PERÍODOS (GLOBALES)
  // ─────────────────────────────────────────────────────────────

  @Post('periodos')
  async createPeriodo(@Body() data: any) {
    return this.evaluationsService.createPeriodo(data);
  }

  @Get('periodos')
  async findPeriodos() {
    return this.evaluationsService.findPeriodos();
  }

  @Get('periodos/:id')
  async findPeriodo(@Param('id') id: string) {
    return this.evaluationsService.findPeriodo(id);
  }

  @Patch('periodos/:id/toggle')
  async togglePeriodo(
    @Param('id') id: string,
    @Body('activo') activo: boolean,
  ) {
    return this.evaluationsService.togglePeriodo(id, activo);
  }

  @Delete('periodos/:id')
  async deletePeriodo(@Param('id') id: string) {
    return this.evaluationsService.deletePeriodo(id);
  }

  // ─────────────────────────────────────────────────────────────
  // EVALUACIONES
  // ─────────────────────────────────────────────────────────────

  /**
   * Listar eligibles (usuarios activos del departamento/tenantId)
   * GET /evaluations/eligibles?periodoId=...
   */
  @Get('eligibles')
  async findEligibles(
    @Req() req: any,
    @Query('periodoId') periodoId: string,
    @Query('tenantId') forcedTenantId?: string,
  ) {
    // Un responsable departamental solo ve su tenantId
    // Un superadmin (tenantId null o especial) podría ver cualquiera si se pasa forcedTenantId
    const tenantId = forcedTenantId || req.user.tenantId;
    return this.evaluationsService.getUsersToEvaluate(tenantId, periodoId);
  }

  /** Alias para el frontend legacy */
  @Get('usuarios')
  async findUsuarios(
    @Req() req: any,
    @Query('periodoId') pId: string,
    @Query('tenantId') tId?: string,
  ) {
    return this.findEligibles(req, pId, tId);
  }

  /**
   * Listar mis propias evaluaciones (historial del docente)
   * GET /evaluations/my/all
   */
  @Get('my/all')
  async findMyEvaluations(@Req() req: any) {
    return this.evaluationsService.findEvaluacionesByUser(req.user.id);
  }

  /**
   * Listar evaluaciones generadas por el responsable
   * GET /evaluations?periodoId=...
   */
  @Get()
  async findEvaluaciones(
    @Req() req: any,
    @Query('periodoId') periodoId?: string,
  ) {
    return this.evaluationsService.findEvaluaciones(
      req.user.tenantId,
      periodoId,
    );
  }

  /**
   * Obtener una evaluación por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.evaluationsService.findEvaluacion(id);
  }

  /**
   * POST /evaluations
   * El RESPONSABLE crea una evaluación para un usuario de su departamento.
   * Body: { userId, periodoId, responsableTenantId, puntajes: [{criterioId, puntaje}] }
   */
  @Post()
  async createEvaluation(@Body() body: any, @Req() req: any) {
    this.logger.log(`POST /evaluations body: ${JSON.stringify(body)}`);
    const { responsableTenantId, ...data } = body;
    return this.evaluationsService.createEvaluation(
      data,
      responsableTenantId,
      req.user.id,
    );
  }

  /**
   * GET /evaluations/pdf/:id
   * El frontend llama a esta ruta para descargar el PDF.
   */
  @Get('pdf/:id')
  async getPdf(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.evaluationsService.generatePDF(id);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hoja_de_concepto_${id}.pdf"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (error) {
      this.logger.error(`Error generating PDF for ${id}: ${error.message}`);
      res
        .status(500)
        .json({ success: false, message: 'No se pudo generar el PDF' });
    }
  }

  /** Alias para compatibilidad */
  @Get(':id/pdf')
  async getPdfAlias(@Param('id') id: string, @Res() res: any) {
    return this.getPdf(id, res);
  }

  @Public()
  @Get('verify/:code')
  async verifyCode(@Param('code') code: string) {
    return this.evaluationsService.verifyCode(code);
  }
}
