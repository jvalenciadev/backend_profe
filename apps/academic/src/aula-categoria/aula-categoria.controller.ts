import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import { AulaCategoriaService } from './aula-categoria.service';

/**
 * AulaCategoriaController
 *
 * Gestión completa de configuraciones de calificación desde el Dashboard.
 *
 * Rutas:
 *  GET  /aula-categorias/tipo-config                        → configs globales por tipo de programa
 *  GET  /aula-categorias/tipo-config/:tipoProgramaId        → configs de un tipo específico
 *  POST /aula-categorias/tipo-config/:tipoProgramaId        → crear config para tipo
 *  PUT  /aula-categorias/tipo-config/:id                    → actualizar config
 *  DELETE /aula-categorias/tipo-config/:id                  → eliminar config (soft)
 *  POST /aula-categorias/modulo/:moduloId/aplicar-config    → aplicar config de tipo a módulo
 *
 *  GET  /aula-categorias/mis-modulos                        → módulos del facilitador autenticado
 *  GET  /aula-categorias/todos-modulos                      → todos los módulos (admin)
 *  GET  /aula-categorias/:moduloId                          → categorías de un módulo
 *  POST /aula-categorias/:moduloId                          → crear categoría en módulo
 *  PUT  /aula-categorias/:id                                → actualizar categoría
 *  DELETE /aula-categorias/:id                              → eliminar categoría (soft)
 */
@Controller('aula-categorias')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AulaCategoriaController {
  constructor(private readonly service: AulaCategoriaService) {}

  // ─── CONFIG GLOBAL POR TIPO DE PROGRAMA ──────────────────────

  @Get('tipo-config')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaTipo'))
  getConfigByTipos() {
    return this.service.getConfigByTipos();
  }

  @Get('tipo-config/:tipoProgramaId')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaTipo'))
  getConfigByTipoId(@Param('tipoProgramaId') tipoProgramaId: string) {
    return this.service.getConfigByTipoId(tipoProgramaId);
  }

  @Post('tipo-config/:tipoProgramaId')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaTipo'))
  createConfig(
    @Param('tipoProgramaId') tipoProgramaId: string,
    @Body() data: any,
  ) {
    return this.service.createConfig(tipoProgramaId, data);
  }

  @Put('tipo-config/:id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaTipo'))
  updateConfig(@Param('id') id: string, @Body() data: any) {
    return this.service.updateConfig(id, data);
  }

  @Delete('tipo-config/:id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ProgramaTipo'))
  deleteConfig(@Param('id') id: string) {
    return this.service.deleteConfig(id);
  }

  // ─── APLICAR CONFIG DE TIPO A MÓDULO ─────────────────────────

  @Post('modulo/:moduloId/aplicar-config')
  @CheckPolicies((ability: any) => ability.can('update', 'Programa'))
  aplicarConfig(
    @Param('moduloId') moduloId: string,
    @Body() body: { tipoProgramaId: string },
  ) {
    return this.service.aplicarConfigAModulo(moduloId, body.tipoProgramaId);
  }

  // ─── MÓDULOS ─────────────────────────────────────────────────

  @Get('mis-modulos')
  @CheckPolicies((ability: any) => ability.can('read', 'Programa'))
  getMisModulos(@Req() req: any) {
    return this.service.getMateriaAsignada(req.user.id);
  }

  @Get('todos-modulos')
  @CheckPolicies((ability: any) => ability.can('read', 'Programa'))
  getAllModulos(@Query() query: any) {
    return this.service.getAllModulos(query);
  }

  // ─── CATEGORÍAS POR MÓDULO ─────────────────────────────────

  @Get(':moduloId')
  @CheckPolicies((ability: any) => ability.can('read', 'Programa'))
  findAll(@Param('moduloId') moduloId: string) {
    return this.service.findAll(moduloId);
  }

  @Post(':moduloId')
  @CheckPolicies((ability: any) => ability.can('update', 'Programa'))
  create(@Param('moduloId') moduloId: string, @Body() data: any) {
    return this.service.create(moduloId, data);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Programa'))
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Programa'))
  updatePatch(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Programa'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
