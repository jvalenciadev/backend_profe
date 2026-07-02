import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { CuestionarioAppService } from './cuestionario-app.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('cuestionarioapp')
@UseGuards(JwtAuthGuard)
export class CuestionarioAppController {
  constructor(
    private readonly cuestionarioAppService: CuestionarioAppService,
  ) {}

  @Get('info/:cuestionarioId')
  async getCuestionarioInfo(
    @Param('cuestionarioId') cuestionarioId: string,
    @Request() req: any,
  ) {
    return this.cuestionarioAppService.getInfo(cuestionarioId, req.user.id);
  }

  @Post('iniciar/:cuestionarioId')
  async iniciarIntentoApp(
    @Param('cuestionarioId') cuestionarioId: string,
    @Request() req: any,
  ) {
    // Aquí puedes capturar el User-Agent para forzar dispositivos móviles si está activo el flag "soloMobile"
    // Sin embargo, en Flutter normalmente se envían headers customs como 'X-App-Platform': 'android' o 'ios'
    const isMobile =
      req.headers['user-agent']?.match(/Android|iPhone|iPad|iPod/i) !== null;

    // Obtenemos info para verificar soloMobile
    const info = await this.cuestionarioAppService.getInfo(
      cuestionarioId,
      req.user.id,
    );

    if (info.cuestionario.soloMobile && !isMobile) {
      if (!req.headers['x-app-platform']?.match(/android|ios|flutter/i)) {
        throw new UnauthorizedException(
          'Este cuestionario solo puede ser realizado desde la App Móvil (Obliga a realizar el cuestionario desde celular o tablet)',
        );
      }
    }

    return this.cuestionarioAppService.iniciarIntento(
      cuestionarioId,
      req.user.id,
    );
  }

  @Post('intento/:intentoId/progreso')
  async guardarProgreso(
    @Param('intentoId') intentoId: string,
    @Request() req: any,
    @Body()
    body: {
      respuestas: {
        preguntaId: string;
        opcionId?: string;
        textoLibre?: string;
      }[];
    },
  ) {
    // Si pierdes la conexión, tu progreso se guardará automáticamente.
    // Este endpoint recibe un array de las respuestas marcadas hasta ahora.
    return this.cuestionarioAppService.guardarProgreso(
      intentoId,
      req.user.id,
      body.respuestas || [],
    );
  }

  @Post('finalizar/:intentoId')
  async finalizarIntento(
    @Param('intentoId') intentoId: string,
    @Request() req: any,
    @Body() body: { motivoBloqueo?: string },
  ) {
    // Finaliza el cuestionario y retorna calificación y retroalimentación (según la configuración)
    return this.cuestionarioAppService.finalizarIntento(
      intentoId,
      req.user.id,
      body.motivoBloqueo,
    );
  }
}
