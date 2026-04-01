import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GradingService } from './grading.service';

/**
 * GradingController — Puerto 3008 (Aula Virtual / LMS)
 *
 * Gestión de categorías de calificación por módulo para facilitadores.
 * Los facilitadores configuran las categorías de su propio módulo.
 *
 * Rutas (bajo prefijo /api/aula):
 *   GET    /modulo/:moduloId/categorias              → listar categorías del módulo
 *   POST   /modulo/:moduloId/categorias              → crear nueva categoría
 *   POST   /modulo/:moduloId/categorias/aplicar      → aplicar plantilla del tipo de programa
 *   PUT    /modulo/:moduloId/categorias/:id          → actualizar categoría del módulo
 *   DELETE /modulo/:moduloId/categorias/:id          → eliminar categoría (soft)
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  /**
   * GET /modulo/:moduloId/categorias
   * Lista las categorías de calificación activas de un módulo.
   */
  @Get('modulo/:moduloId/categorias')
  getCategorias(
    @Param('moduloId') moduloId: string,
    @Query('turnoId') turnoId?: string,
  ) {
    return this.gradingService.getCategoriasModulo(moduloId, turnoId);
  }

  /**
   * POST /modulo/:moduloId/categorias
   * Crea una nueva categoría de calificación en el módulo.
   * Solo el facilitador asignado puede crear.
   */
  @Post('modulo/:moduloId/categorias')
  createCategoria(
    @Param('moduloId') moduloId: string,
    @Body()
    body: {
      nombre: string;
      peso: number;
      turnoId?: string;
      esEvalFinal?: boolean;
    },
    @Request() req: any,
  ) {
    return this.gradingService.crearCategoria(req.user.id, moduloId, body);
  }

  /**
   * POST /modulo/:moduloId/categorias/aplicar
   * Aplica la plantilla de categorías configurada para el tipo de programa.
   * Genera instancias en mod_categoria_calificacion desde mod_tipo_calificacion_config.
   */
  @Post('modulo/:moduloId/categorias/aplicar')
  aplicarPlantilla(
    @Param('moduloId') moduloId: string,
    @Query('turnoId') turnoId: string,
    @Request() req: any,
  ) {
    return this.gradingService.aplicarPlantilla(req.user.id, moduloId, turnoId);
  }

  /**
   * PUT /modulo/:moduloId/categorias/:id
   * Actualiza nombre, peso o tipo de evaluación de una categoría.
   */
  @Put('modulo/:moduloId/categorias/:id')
  updateCategoria(
    @Param('moduloId') moduloId: string,
    @Param('id') id: string,
    @Body() body: { nombre?: string; peso?: number; esEvalFinal?: boolean },
    @Request() req: any,
  ) {
    return this.gradingService.actualizarCategoria(
      req.user.id,
      moduloId,
      id,
      body,
    );
  }

  /**
   * DELETE /modulo/:moduloId/categorias/:id
   * Soft-delete de una categoría del módulo.
   */
  @Delete('modulo/:moduloId/categorias/:id')
  deleteCategoria(
    @Param('moduloId') moduloId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.gradingService.eliminarCategoria(req.user.id, moduloId, id);
  }
}
