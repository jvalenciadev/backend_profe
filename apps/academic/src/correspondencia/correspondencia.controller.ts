import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@app/common';
import { CorrespondenciaService } from './correspondencia.service';
import { CreateCorrespondenciaDto } from './dto/create-correspondencia.dto';

@Controller('correspondencia')
@UseGuards(JwtAuthGuard)
export class CorrespondenciaController {
  constructor(private readonly service: CorrespondenciaService) {}

  /** POST /correspondencia — Crea nota/informe con CITE automático */
  @Post()
  create(@Body() dto: CreateCorrespondenciaDto, @Req() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.create(dto, userId);
  }

  /** GET /correspondencia/buscar?cite=INF/PROFE Nro. 2/2026 */
  @Get('buscar')
  findByCite(@Query('cite') cite: string) {
    return this.service.findByCite(cite);
  }

  /** GET /correspondencia/bandeja — Documentos del usuario autenticado clasificados */
  @Get('bandeja')
  findMyBandeja(@Req() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getBandejaCategorizada(userId);
  }

  /** GET /correspondencia/usuarios?q=Maria — Autocompletado */
  @Get('usuarios')
  buscarUsuarios(@Query('q') q: string) {
    return this.service.buscarUsuarios(q ?? '');
  }

  /** PUT /correspondencia/:id/avanzar — Avanzar estado con soporte para derivación dinámica */
  @Put(':id/avanzar')
  avanzar(
    @Param('id') id: string,
    @Body()
    body: {
      accion: string;
      detalle: string;
      archivoUrl?: string;
      nuevoDestinatarioId?: string;
    },
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.avanzarEstado(
      id,
      body.accion,
      body.detalle,
      userId,
      body.archivoUrl,
      body.nuevoDestinatarioId,
    );
  }

  @Post(':id/pdf')
  subirPdf(@Param('id') id: string, @Body('url') url: string) {
    return this.service.updatePdf(id, url);
  }

  @Get('buscar-id/:id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
