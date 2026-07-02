import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { LmsService } from './lms.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppConfigService } from './app-config/app-config.service';

/**
 * LmsController — Puerto 3008 (Aula Virtual)
 *
 * Maneja: auth, cursos, foros, tareas, actividades.
 * Las categorías de calificación son responsabilidad de GradingController.
 */
@Controller()
export class LmsController {
  constructor(
    private readonly lmsService: LmsService,
    private readonly appConfigService: AppConfigService,
  ) {}

  @Post('auth/login')
  async login(@Body() body: any) {
    return this.lmsService.login(
      body.username,
      body.password,
      body.tokenDispositivo,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('mis-cursos')
  async getMisCursos(@Request() req: any) {
    return this.lmsService.getMisCursos(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('docencia')
  async getDocencia(@Request() req: any) {
    return this.lmsService.getDocencia(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('docencia/:id/estudiantes')
  async getEstudiantesPorCurso(
    @Param('id') id: string,
    @Query('turnoId') turnoId: string,
  ) {
    console.log(
      `[DEBUG] getEstudiantes → moduloId: "${id}", turnoId: "${turnoId}"`,
    );
    const result = await this.lmsService.getEstudiantesPorCurso(id, turnoId);
    console.log(`[DEBUG] getEstudiantes → found: ${result.length} estudiantes`);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('curso/:id')
  async getCourseContent(
    @Param('id') id: string,
    @Query('turnoId') turnoId: string,
    @Request() req: any,
  ) {
    return this.lmsService.getCourseContent(id, req.user.id, turnoId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('curso/:id/actividad/:actId')
  async getActividadDetalle(
    @Param('id') id: string,
    @Param('actId') actId: string,
  ) {
    return this.lmsService.getActividadDetalle(actId);
  }

  // ─── FOROS ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('foro/:id/posts')
  async getForoPosts(@Param('id') id: string) {
    return this.lmsService.getForoPosts(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('foro/:id/post')
  async crearPost(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.lmsService.crearPost(id, req.user.id, body);
  }

  // ─── TAREAS ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('tarea/:id/entrega')
  async submitTarea(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.lmsService.submitTarea(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verificar-pago/:inscripcionId')
  async verificarPago(@Param('inscripcionId') inscripcionId: string) {
    if (
      !inscripcionId ||
      inscripcionId === 'undefined' ||
      inscripcionId === 'null'
    ) {
      throw new BadRequestException('El ID de inscripción no es válido');
    }
    return this.lmsService.verificarPago(inscripcionId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('confirmar-inscripcion/:inscripcionId')
  async confirmarInscripcion(
    @Param('inscripcionId') inscripcionId: string,
    @Request() req: any,
  ) {
    return this.lmsService.confirmarInscripcion(req.user.id, inscripcionId);
  }

  // ─── ACTIVIDADES (FACILITADOR) ────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('actividades')
  async crearActividad(@Body() body: any, @Request() req: any) {
    return this.lmsService.crearActividad(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('actividades/:id')
  async updateActividad(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.lmsService.updateActividad(req.user.id, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('actividades/reordenar')
  async reordenarActividades(
    @Body() body: { id: string; orden: number }[],
    @Request() req: any,
  ) {
    return this.lmsService.reordenarActividades(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('actividades/:id')
  async eliminarActividad(@Param('id') id: string, @Request() req: any) {
    return this.lmsService.deleteActividad(req.user.id, id);
  }
  @UseGuards(JwtAuthGuard)
  @Get('modulo/:id/unidades')
  async getUnidades(@Param('id') id: string, @Request() req: any) {
    return this.lmsService.getModuloUnidades(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('modulo/:id/unidades')
  async crearUnidad(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.lmsService.crearModuloUnidad(req.user.id, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('modulo/:moduloId/unidades/:id')
  async actualizarUnidad(
    @Param('moduloId') moduloId: string,
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.lmsService.updateModuloUnidad(req.user.id, moduloId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('modulo/:moduloId/unidades/:id')
  async eliminarUnidad(
    @Param('moduloId') moduloId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.lmsService.eliminarModuloUnidad(req.user.id, moduloId, id);
  }

  // ─── RECURSOS ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('recursos')
  async crearRecurso(@Body() body: any, @Request() req: any) {
    return this.lmsService.crearRecurso(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('recursos/:id')
  async eliminarRecurso(@Param('id') id: string, @Request() req: any) {
    return this.lmsService.deleteRecurso(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('recursos/:id')
  async actualizarRecurso(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.lmsService.updateRecurso(req.user.id, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('recursos/reordenar')
  async reordenarRecursos(
    @Body() body: { id: string; orden: number }[],
    @Request() req: any,
  ) {
    return this.lmsService.reordenarRecursos(req.user.id, body);
  }

  // ─── CALIFICACIONES ─────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('actividad/:actId/entregas')
  async getEntregas(@Param('actId') actId: string, @Request() req: any) {
    return this.lmsService.getEntregasPorActividad(req.user.id, actId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('calificar')
  async calificar(@Body() body: any, @Request() req: any) {
    return this.lmsService.calificarEntrega(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('modulo/:id/reporte-calificaciones')
  async getReporteCalificaciones(
    @Param('id') id: string,
    @Query('turnoId') turnoId: string,
    @Request() req: any,
  ) {
    return this.lmsService.getReporteCalificaciones(req.user.id, id, turnoId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('modulo/:id/mis-calificaciones')
  async getMisCalificaciones(@Param('id') id: string, @Request() req: any) {
    return this.lmsService.getMisCalificacionesPorModulo(req.user.id, id);
  }
  // ─── CAMPOS EXTRA DEL PERFIL ──────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('perfil/campos-extra')
  async getCamposExtraPerfil(@Request() req: any) {
    return this.lmsService.getCamposExtraPerfil(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('perfil/campos-extra')
  async guardarRespuestaCampoExtra(
    @Request() req: any,
    @Body() body: { respuestas: { campoExtraId: string; valor: string }[] },
  ) {
    if (!body || !body.respuestas)
      throw new BadRequestException('Se requieren las respuestas');
    return this.lmsService.guardarRespuestasCampoExtra(
      req.user.id,
      body.respuestas,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  async getPerfil(@Request() req: any) {
    return this.lmsService.getPerfil(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('perfil')
  async updatePerfil(@Request() req: any, @Body() body: any) {
    return this.lmsService.updatePerfil(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request-email-verification')
  async requestEmailVerification(
    @Request() req: any,
    @Body('email') email: string,
  ) {
    return this.lmsService.requestEmailVerification(req.user.id, email);
  }

  @Get('test-push/:userId')
  async testPush(
    @Param('userId') userId: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.lmsService.testPush(userId, tipo);
  }

  // ─── VERSION MOBILE (Flutter lo llama directamente) ─────────
  // Flutter: client.lmsDio.get('version-mobile') → /api/aula/version-mobile
  @Get('version-mobile')
  async getVersionMobile() {
    return this.appConfigService.getVersionMobile();
  }

  @UseGuards(JwtAuthGuard)
  @Get('modulo/:id/exportar')
  async exportarModulo(
    @Param('id') id: string,
    @Query('turnoId') turnoId: string,
    @Request() req: any,
  ) {
    return this.lmsService.exportarModulo(req.user.id, id, turnoId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('modulo/:id/importar')
  async importarModulo(
    @Param('id') id: string,
    @Query('turnoId') turnoId: string,
    @Body() body: { data: any; ajustarFechas: boolean },
    @Request() req: any,
  ) {
    if (!body || !body.data) {
      throw new BadRequestException(
        'Se requiere la estructura de datos para importar',
      );
    }
    return this.lmsService.importarModulo(
      req.user.id,
      id,
      turnoId,
      body.data,
      body.ajustarFechas,
    );
  }
}
