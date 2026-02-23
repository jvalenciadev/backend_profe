import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BancoProfesionalService } from './banco-profesional.service';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';

@Controller('banco-profesional')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BancoProfesionalController {
  constructor(private readonly service: BancoProfesionalService) {}

  // ─── REGISTRO PUBLICO (Aunque tenga guards, a veces este es publico, pero segun requerimiento es para postulantes) ───
  @Post('registrar')
  @CheckPolicies((ability) => true) // Permitir registro inicial (o manejarlo en auth)
  registrar(@Body() data: any) {
    return this.service.registrar(data);
  }

  // ─── MI FICHA (Postulante logueado) ───
  @Get('mi-ficha')
  @CheckPolicies((ability) => true)
  getMiFicha(@Req() req: any) {
    return this.service.getMiFicha(req.user.id);
  }

  // ─── ADMINISTRACION DE FICHAS ───
  @Get()
  @CheckPolicies((ability) => ability.can('read', 'BancoProfesional'))
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can('read', 'BancoProfesional'))
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('mi-ficha')
  @CheckPolicies((ability) => true)
  updateMiFicha(@Body() data: any, @Req() req: any) {
    return this.service.update(req.user.id, data, req.user.id);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can('delete', 'BancoProfesional'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }

  @Patch(':id/aprobar')
  @CheckPolicies((ability) => ability.can('update', 'BancoProfesional'))
  aprobar(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.service.aprobar(id, data, req.user.id);
  }

  // ─── POSTGRADOS ───
  @Get(':id/posgrados')
  @CheckPolicies((ability) => true)
  getPosgrados(@Param('id') id: string) {
    return this.service.getPosgrados(id);
  }

  @Post(':id/posgrados')
  @CheckPolicies((ability) => true)
  addPosgrado(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    // En un enfoque senior, podríamos validar que id === req.user.id si no es admin
    return this.service.addPosgrado(id, data, req.user.id);
  }

  @Patch('posgrados/:posgradoId')
  @CheckPolicies((ability) => true)
  updatePosgrado(
    @Param('posgradoId') posgradoId: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.service.updatePosgrado(posgradoId, data, req.user.id);
  }

  @Delete('posgrados/:posgradoId')
  @CheckPolicies((ability) => true)
  removePosgrado(@Param('posgradoId') posgradoId: string, @Req() req: any) {
    return this.service.removePosgrado(posgradoId, req.user.id);
  }

  // ─── PRODUCCION INTELECTUAL ───
  @Get(':id/produccion')
  @CheckPolicies((ability) => true)
  getProduccion(@Param('id') id: string) {
    return this.service.getProduccion(id);
  }

  @Post(':id/produccion')
  @CheckPolicies((ability) => true)
  addProduccion(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.service.addProduccion(id, data, req.user.id);
  }

  @Patch('produccion/:produccionId')
  @CheckPolicies((ability) => true)
  updateProduccion(
    @Param('produccionId') produccionId: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.service.updateProduccion(produccionId, data, req.user.id);
  }

  @Delete('produccion/:produccionId')
  @CheckPolicies((ability) => true)
  removeProduccion(
    @Param('produccionId') produccionId: string,
    @Req() req: any,
  ) {
    return this.service.removeProduccion(produccionId, req.user.id);
  }

  // ─── CONFIGURACIONES (Tipos Posgrado, Categorias, Cargos) ───
  @Get('config/tipos-posgrado')
  getTiposPosgrado() {
    return this.service.getTiposPosgrado();
  }

  @Get('config/categorias')
  getCategorias() {
    return this.service.getCategorias();
  }

  @Get('config/cargos')
  getCargos() {
    return this.service.getCargos();
  }
}
