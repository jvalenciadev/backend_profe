import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { CuestionarioService } from './cuestionario.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('cuestionarios')
@UseGuards(JwtAuthGuard)
export class CuestionarioController {
  constructor(private readonly cuestionarioService: CuestionarioService) {}

  @Get(':id')
  async getCuestionario(@Param('id') id: string) {
    return this.cuestionarioService.getCuestionario(id);
  }

  @Get('actividad/:actId')
  async getByActividad(@Param('actId') actId: string) {
    return this.cuestionarioService.getCuestionarioByActividad(actId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.cuestionarioService.updateCuestionario(id, body);
  }

  @Get(':id/intentos')
  async getIntentos(@Param('id') id: string) {
    return this.cuestionarioService.getIntentosPorCuestionario(id);
  }

  @Get(':id/lobby')
  async getLobby(@Param('id') id: string, @Request() req: any) {
    return this.cuestionarioService.getLobbyData(req.user.id, id);
  }

  @Post(':id/sync-preguntas')
  async syncPreguntas(@Param('id') id: string, @Body() body: any) {
    return this.cuestionarioService.syncPreguntas(id, body.preguntas);
  }

  @Post(':id/iniciar')
  async iniciar(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.cuestionarioService.iniciarIntento(req.user.id, id, body);
  }

  @Post('intento/:intentoId/responder')
  async responder(@Param('intentoId') intentoId: string, @Body() body: any) {
    return this.cuestionarioService.resolverRespuesta(intentoId, body);
  }

  @Post('intento/:intentoId/finalizar')
  async finalizar(@Param('intentoId') intentoId: string) {
    return this.cuestionarioService.finalizarIntento(intentoId);
  }

  // ─── FACILITADOR ────────────────────────────────────────────

  @Get(':id/buscar-intento/:ci')
  async buscarIntento(@Param('id') id: string, @Param('ci') ci: string) {
    return this.cuestionarioService.buscarIntentoPorCI(id, ci);
  }

  @Post(':id/verificar-facilitador')
  async verificarFacilitador(@Param('id') id: string, @Body() body: any) {
    console.log('DEBUG: Verificando facilitador para cuestionario', id);
    const isAuthorized =
      await this.cuestionarioService.verificarFacilitadorPassword(
        id,
        body.password,
      );
    return { isAuthorized };
  }

  @Post('intento/:intentoId/reset')
  async resetIntento(
    @Param('intentoId') intentoId: string,
    @Request() req: any,
  ) {
    return this.cuestionarioService.resetearIntento(intentoId, req.user.id);
  }
}
