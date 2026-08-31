import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  Res,
  Patch,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard, Public } from '@app/common';
import {
  CreatePeriodoUseCase,
  UpdatePeriodoUseCase,
  GetPeriodosUseCase,
  GetPeriodoByIdUseCase,
  TogglePeriodoUseCase,
  DeletePeriodoUseCase,
} from '../../application/use-cases/periodo.use-cases';
import {
  CreateCuestionarioUseCase,
  GetCuestionariosUseCase,
  GetCuestionarioByIdUseCase,
  GetCuestionariosByCargoUseCase,
  UpdateCuestionarioUseCase,
  DeleteCuestionarioUseCase,
} from '../../application/use-cases/cuestionario.use-cases';
import {
  CreateAsignacionUseCase,
  CreateAsignacionesMasivasUseCase,
  GetAsignacionesByEvaluadorUseCase,
  GetAsignacionesByEvaluadoUseCase,
  GetAsignacionByIdUseCase,
  GetAllAsignacionesUseCase,
  DeleteAsignacionUseCase,
} from '../../application/use-cases/asignacion.use-cases';
import {
  IniciarIntentoUseCase,
  ResponderIntentoUseCase,
  GetIntentoByIdUseCase,
  GetConsolidadoEvaluadoUseCase,
  VerifyEvaluacionCodeUseCase,
  GetUsersToEvaluateUseCase,
} from '../../application/use-cases/evaluacion.use-cases';
import { GeneratePDFUseCase } from '../../application/use-cases/generate-pdf.use-case';

@Controller('evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
  private readonly logger = new Logger(EvaluationsController.name);

  constructor(
    // Períodos
    private readonly createPeriodoUseCase: CreatePeriodoUseCase,
    private readonly updatePeriodoUseCase: UpdatePeriodoUseCase,
    private readonly getPeriodosUseCase: GetPeriodosUseCase,
    private readonly getPeriodoByIdUseCase: GetPeriodoByIdUseCase,
    private readonly togglePeriodoUseCase: TogglePeriodoUseCase,
    private readonly deletePeriodoUseCase: DeletePeriodoUseCase,
    // Cuestionarios
    private readonly createCuestionarioUseCase: CreateCuestionarioUseCase,
    private readonly getCuestionariosUseCase: GetCuestionariosUseCase,
    private readonly getCuestionarioByIdUseCase: GetCuestionarioByIdUseCase,
    private readonly getCuestionariosByCargoUseCase: GetCuestionariosByCargoUseCase,
    private readonly updateCuestionarioUseCase: UpdateCuestionarioUseCase,
    private readonly deleteCuestionarioUseCase: DeleteCuestionarioUseCase,
    // Asignaciones
    private readonly createAsignacionUseCase: CreateAsignacionUseCase,
    private readonly createAsignacionesMasivasUseCase: CreateAsignacionesMasivasUseCase,
    private readonly getAsignacionesByEvaluadorUseCase: GetAsignacionesByEvaluadorUseCase,
    private readonly getAsignacionesByEvaluadoUseCase: GetAsignacionesByEvaluadoUseCase,
    private readonly getAsignacionByIdUseCase: GetAsignacionByIdUseCase,
    private readonly getAllAsignacionesUseCase: GetAllAsignacionesUseCase,
    private readonly deleteAsignacionUseCase: DeleteAsignacionUseCase,
    // Intentos & Respuestas
    private readonly iniciarIntentoUseCase: IniciarIntentoUseCase,
    private readonly responderIntentoUseCase: ResponderIntentoUseCase,
    private readonly getIntentoByIdUseCase: GetIntentoByIdUseCase,
    private readonly getConsolidadoEvaluadoUseCase: GetConsolidadoEvaluadoUseCase,
    private readonly verifyCodeUseCase: VerifyEvaluacionCodeUseCase,
    private readonly getUsersToEvaluateUseCase: GetUsersToEvaluateUseCase,
    // PDF
    private readonly generatePDFUseCase: GeneratePDFUseCase,
  ) {}

  // ── PERÍODOS ─────────────────────────────────────────────────────────────

  @Post('periodos')
  async createPeriodo(@Body() data: any) {
    return this.createPeriodoUseCase.execute(data);
  }

  @Put('periodos/:id')
  async updatePeriodo(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.updatePeriodoUseCase.execute(id, data);
  }

  @Get('periodos')
  async findPeriodos() {
    return this.getPeriodosUseCase.execute();
  }

  @Get('periodos/:id')
  async findPeriodo(@Param('id') id: string) {
    return this.getPeriodoByIdUseCase.execute(id);
  }

  @Patch('periodos/:id/toggle')
  async togglePeriodo(
    @Param('id') id: string,
    @Body('activo') activo: boolean,
  ) {
    return this.togglePeriodoUseCase.execute(id, activo);
  }

  @Delete('periodos/:id')
  async deletePeriodo(@Param('id') id: string) {
    return this.deletePeriodoUseCase.execute(id);
  }

  // ── CUESTIONARIOS POR CARGO ──────────────────────────────────────────────

  @Post('cuestionarios')
  async createCuestionario(@Req() req: any, @Body() data: any) {
    return this.createCuestionarioUseCase.execute({
      ...data,
      createdBy: req.user?.id,
    });
  }

  @Get('cuestionarios')
  async findCuestionarios(@Query('periodoId') periodoId?: string) {
    return this.getCuestionariosUseCase.execute(periodoId);
  }

  @Get('cuestionarios/cargo/:cargoId')
  async findCuestionariosByCargo(
    @Param('cargoId') cargoId: string,
    @Query('periodoId') periodoId?: string,
  ) {
    return this.getCuestionariosByCargoUseCase.execute(cargoId, periodoId);
  }

  @Get('cuestionarios/:id')
  async findCuestionarioById(@Param('id') id: string) {
    return this.getCuestionarioByIdUseCase.execute(id);
  }

  @Put('cuestionarios/:id')
  async updateCuestionario(@Param('id') id: string, @Body() data: any) {
    return this.updateCuestionarioUseCase.execute(id, data);
  }

  @Delete('cuestionarios/:id')
  async deleteCuestionario(@Param('id') id: string) {
    return this.deleteCuestionarioUseCase.execute(id);
  }

  // ── ASIGNACIONES (QUIÉN EVALÚA A QUIÉN) ──────────────────────────────────

  @Post('asignaciones')
  async createAsignacion(@Req() req: any, @Body() data: any) {
    return this.createAsignacionUseCase.execute({
      ...data,
      createdBy: req.user?.id,
    });
  }

  @Post('asignaciones/masivas')
  async createAsignacionesMasivas(@Req() req: any, @Body() data: { asignaciones: any[] }) {
    const list = (data.asignaciones || []).map((a) => ({
      ...a,
      createdBy: req.user?.id,
    }));
    return this.createAsignacionesMasivasUseCase.execute(list);
  }

  @Get('asignaciones')
  async findAllAsignaciones(
    @Query('tenantId') tenantId?: string,
    @Query('periodoId') periodoId?: string,
  ) {
    return this.getAllAsignacionesUseCase.execute(tenantId, periodoId);
  }

  @Get('asignaciones/mis-pendientes')
  async findMisPendientes(@Req() req: any, @Query('periodoId') periodoId?: string) {
    return this.getAsignacionesByEvaluadorUseCase.execute(req.user.id, periodoId);
  }

  @Get('asignaciones/mis-evaluaciones')
  async findMisEvaluaciones(@Req() req: any, @Query('periodoId') periodoId?: string) {
    return this.getAsignacionesByEvaluadoUseCase.execute(req.user.id, periodoId);
  }

  @Get('asignaciones/evaluado/:evaluadoId')
  async findAsignacionesByEvaluado(
    @Param('evaluadoId') evaluadoId: string,
    @Query('periodoId') periodoId?: string,
  ) {
    return this.getAsignacionesByEvaluadoUseCase.execute(evaluadoId, periodoId);
  }

  @Get('asignaciones/:id')
  async findAsignacionById(@Param('id') id: string) {
    return this.getAsignacionByIdUseCase.execute(id);
  }

  @Delete('asignaciones/:id')
  async deleteAsignacion(@Param('id') id: string) {
    return this.deleteAsignacionUseCase.execute(id);
  }

  // ── INTENTOS Y RESPUESTAS (TEMPORIZADOR Y ESCALA LIKERT) ──────────────────

  @Post('intentos/iniciar')
  async iniciarIntento(@Body() data: { evaluacionAdminId: string }) {
    return this.iniciarIntentoUseCase.execute(data);
  }

  @Get('intentos/:id')
  async findIntentoById(@Param('id') id: string) {
    return this.getIntentoByIdUseCase.execute(id);
  }

  @Post('intentos/responder')
  async responderIntento(@Body() data: any) {
    return this.responderIntentoUseCase.execute(data);
  }

  @Get('consolidado/:evaluadoId/:periodoId')
  async getConsolidado(
    @Param('evaluadoId') evaluadoId: string,
    @Param('periodoId') periodoId: string,
  ) {
    return this.getConsolidadoEvaluadoUseCase.execute(evaluadoId, periodoId);
  }

  // ── USUARIOS Y COMPATIBILIDAD ─────────────────────────────────────────────

  @Get('eligibles')
  async findEligibles(
    @Req() req: any,
    @Query('periodoId') periodoId: string,
    @Query('tenantId') forcedTenantId?: string,
  ) {
    const tenantId = forcedTenantId || req.user.tenantId;
    return this.getUsersToEvaluateUseCase.execute(tenantId, periodoId);
  }

  @Get('usuarios')
  async findUsuarios(
    @Req() req: any,
    @Query('periodoId') pId: string,
    @Query('tenantId') tId?: string,
  ) {
    const tenantId = tId || req.user.tenantId;
    return this.getUsersToEvaluateUseCase.execute(tenantId, pId);
  }

  @Public()
  @Get('verify/:code')
  async verifyCode(@Param('code') code: string) {
    return this.verifyCodeUseCase.execute(code);
  }

  @Get('pdf/:id')
  async getPdf(@Param('id') id: string, @Res() res: any) {
    const pdfBuffer = await this.generatePDFUseCase.execute(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=evaluacion-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
