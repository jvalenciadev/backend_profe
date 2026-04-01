import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InsigniasService } from './insignias.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('insignias')
@UseGuards(JwtAuthGuard)
export class InsigniasController {
  constructor(private readonly insigniasService: InsigniasService) {}

  /** GET /insignias/me — Insignias del usuario autenticado */
  @Get('me')
  async getMyInsignias(@Request() req: any) {
    return this.insigniasService.getInsigniasUsuario(req.user.id);
  }

  /** GET /insignias/all — Todas las insignias disponibles en el sistema */
  @Get('all')
  async getAllInsignias() {
    return this.insigniasService.getInsigniasDisponibles();
  }

  /** GET /insignias/modulo/:moduloId — Insignias de participantes de un módulo */
  @Get('modulo/:moduloId')
  async getInsigniasPorModulo(
    @Param('moduloId') moduloId: string,
    @Query('turnoId') turnoId?: string,
  ) {
    return this.insigniasService.getInsigniasPorModulo(moduloId, turnoId);
  }

  /** POST /insignias/otorgar — Facilitador otorga una insignia a un participante */
  @Post('otorgar')
  async otorgarManual(
    @Body() body: { targetUserId: string; insigniaId: string },
    @Request() req: any,
  ) {
    return this.insigniasService.otorgarInsigniaManual(req.user.id, body);
  }

  /** DELETE /insignias/revocar — Facilitador revoca una insignia de un participante */
  @Delete('revocar')
  async revocar(
    @Body() body: { targetUserId: string; insigniaId: string },
    @Request() req: any,
  ) {
    return this.insigniasService.revocarInsignia(req.user.id, body);
  }

  /** ─── ADMIN ENDPOINTS ─────────────────────────────────────── */

  /** POST /insignias — Crear una nueva insignia (Admin) */
  @Post()
  async create(@Body() body: any) {
    return this.insigniasService.createInsignia(body);
  }

  /** PUT /insignias/:id — Actualizar una insignia existente (Admin) */
  @Post(':id/update') // Overriding for potential issues with PUT in some environments
  async update(@Param('id') id: string, @Body() body: any) {
    return this.insigniasService.updateInsignia(id, body);
  }

  /** DELETE /insignias/:id — Eliminar una insignia (Admin) */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.insigniasService.deleteInsignia(id);
  }
}
