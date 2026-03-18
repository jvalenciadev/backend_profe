import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { AsistenciaService } from './asistencia.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('asistencia')
@UseGuards(JwtAuthGuard)
export class AsistenciaController {
    constructor(private readonly asistenciaService: AsistenciaService) { }

    @Get('modulo/:id')
    async getSesiones(@Param('id') id: string, @Query('turnoId') turnoId: string) {
        return this.asistenciaService.getSesionesModulo(id, turnoId);
    }

    @Post('modulo/:id')
    async crearSesion(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.asistenciaService.crearSesion(req.user.id, id, body);
    }

    @Get('sesion/:id/registros')
    async getRegistros(@Param('id') id: string, @Request() req: any) {
        return this.asistenciaService.getRegistrosSesion(req.user.id, id);
    }

    @Post('sesion/:id/registrar')
    async registrar(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.asistenciaService.registrarAsistencia(req.user.id, id, body);
    }

    @Get('modulo/:id/mi-asistencia')
    async getMiAsistencia(@Param('id') id: string, @Request() req: any) {
        return this.asistenciaService.getAsistenciaEstudiante(req.user.id, id);
    }

    /** Genera un token QR firmado (HMAC-SHA256, 60 min) para la sesión */
    @Get('sesion/:id/qr-token')
    async getQrToken(@Param('id') id: string, @Request() req: any) {
        return this.asistenciaService.generateQrToken(req.user.id, id);
    }

    /** El estudiante envía el token QR para registrar su asistencia */
    @Post('sesion/marcar-qr')
    async marcarQR(@Body() body: { token: string }, @Request() req: any) {
        return this.asistenciaService.marcarAsistenciaQR(req.user.id, body.token);
    }
}
