import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class GradingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────

  private async verifyFacilitador(userId: string, moduloId: string) {
    // 1. Intentar como módulo LMS normal
    const asignacion = await this.prisma.programaDosFacilitador.findFirst({
      where: { facilitadorId: userId, moduloId, estado: 'activo' },
      include: {
        programaDos: {
          include: { tipo: true },
        },
      },
    });
    if (asignacion) return asignacion;

    // 2. Intentar como módulo maestro global
    const asignacionMaestro =
      await this.prisma.programaDosFacilitador.findFirst({
        where: {
          facilitadorId: userId,
          moduloMaestroId: moduloId,
          estado: 'activo',
        },
        include: {
          programaDos: {
            include: { tipo: true },
          },
        },
      });
    if (asignacionMaestro) return asignacionMaestro;

    // 3. Verificar si es facilitador directo del ProgramaModulo (fallback)
    const masterMod = await this.prisma.programaModulo.findFirst({
      where: { id: moduloId, facilitadorId: userId },
      include: { programa: { include: { tipo: true } } },
    });

    if (masterMod) {
      // Retornamos un objeto compatible con lo que espera el servicio
      return {
        programaDos: {
          tipoId: masterMod.programa.tipoId,
          tipo: masterMod.programa.tipo,
        },
      } as any;
    }

    throw new UnauthorizedException('No eres facilitador de este módulo');
  }

  private async validatePeso(
    moduloId: string,
    nuevoPeso: number,
    excludeId?: string,
    turnoId?: string,
  ) {
    const existentes = await this.prisma.mod_categoria_calificacion.findMany({
      where: {
        OR: [{ moduloId: moduloId }, { moduloMaestroId: moduloId }],
        turnoId: turnoId || null,
        estado: 'activo',
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      include: { config: true },
    });
    const pesoActual = existentes.reduce((s, c) => s + (c.config.peso || 0), 0);
    if (pesoActual + nuevoPeso > 100) {
      throw new BadRequestException(
        `El peso total supera 100%. Disponible: ${100 - pesoActual}%`,
      );
    }
    return pesoActual;
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD CATEGORÍAS DE CALIFICACIÓN POR MÓDULO
  // ─────────────────────────────────────────────────────────────

  /**
   * Lista las categorías de calificación basadas en la configuración global del Tipo de Programa.
   * Sigue la ruta: modulo -> programaDos -> tipoId -> mod_tipo_calificacion_config
   */
  async getCategoriasModulo(moduloId: string, turnoId?: string) {
    // 1. Obtener la información del tipo de programa del módulo (LMS u OTRO)
    let tipoId: string | null = null;

    const moduloDos = await this.prisma.programaModuloDos.findUnique({
      where: { id: moduloId },
      include: { programaDos: true },
    });

    if (moduloDos) {
      tipoId = moduloDos.programaDos.tipoId;
    } else {
      const master = await this.prisma.programaModulo.findUnique({
        where: { id: moduloId },
        include: { programa: true },
      });
      if (master) tipoId = master.programa.tipoId;
    }

    if (!tipoId) {
      throw new NotFoundException(
        'No se pudo determinar el tipo de programa para este módulo',
      );
    }

    // 2. Obtener las configuraciones globales (plantilla) para este tipo de programa
    const configsGlobales =
      await this.prisma.mod_tipo_calificacion_config.findMany({
        where: { tipoProgramaId: tipoId, estado: 'activo' },
        orderBy: { orden: 'asc' },
      });

    // 3. Para cada configuración global, asegurar que exista una instancia (puente) en el módulo.
    // Esto es vital para la integridad referencial de mod_actividad -> mod_categoria_calificacion.
    const resultados: any[] = [];
    for (const config of configsGlobales) {
      // Buscamos si ya existe la relación para este módulo (sea local o maestro)
      let instancia = await this.prisma.mod_categoria_calificacion.findFirst({
        where: {
          OR: [
            { moduloId: moduloId, configId: config.id },
            { moduloMaestroId: moduloId, configId: config.id },
          ],
          turnoId: turnoId || null,
        },
      });

      // Si no existe, la creamos automáticamente
      if (!instancia) {
        const isMaster = await this.prisma.programaModulo.findUnique({
          where: { id: moduloId },
        });
        instancia = await this.prisma.mod_categoria_calificacion.create({
          data: {
            ...(isMaster
              ? { moduloMaestroId: moduloId }
              : { moduloId: moduloId }),
            configId: config.id,
            turnoId: turnoId || null,
            estado: 'activo',
          },
        });
      } else if (instancia.estado !== 'activo') {
        // Si estaba inactiva, la reactivamos para que coincida con la plantilla activa
        instancia = await this.prisma.mod_categoria_calificacion.update({
          where: { id: instancia.id },
          data: { estado: 'activo' },
        });
      }

      resultados.push({
        id: instancia.id,
        nombre: config.nombre,
        peso: config.peso,
        ponderacion: config.peso,
        esEvalFinal: config.esEvalFinal,
        orden: config.orden,
        configId: instancia.configId,
      });
    }

    return resultados;
  }

  /**
   * Crea una nueva categoría de calificación para el módulo.
   * - Verifica que el usuario sea facilitador del módulo.
   * - Crea un config en mod_tipo_calificacion_config (adhoc para el tipo del programa).
   * - Vincula la instancia en mod_categoria_calificacion.
   */
  async crearCategoria(
    userId: string,
    moduloId: string,
    data: {
      nombre: string;
      peso: number;
      esEvalFinal?: boolean;
      turnoId?: string;
    },
  ) {
    const asignacion = await this.verifyFacilitador(userId, moduloId);
    await this.validatePeso(moduloId, data.peso, undefined, data.turnoId);

    const isMaster = await this.prisma.programaModulo.findUnique({
      where: { id: moduloId },
    });

    const existentes = await this.prisma.mod_categoria_calificacion.count({
      where: {
        ...(isMaster ? { moduloMaestroId: moduloId } : { moduloId: moduloId }),
        turnoId: data.turnoId || null,
        estado: 'activo',
      },
    });

    // Crear config en mod_tipo_calificacion_config (del tipo del programa)
    const config = await this.prisma.mod_tipo_calificacion_config.create({
      data: {
        tipoProgramaId: asignacion.programaDos.tipoId,
        nombre: data.nombre,
        peso: Number(data.peso),
        esEvalFinal: data.esEvalFinal ?? false,
        orden: existentes,
        estado: 'activo',
      },
    });

    // Vincular instancia al módulo (identificando si es maestro o no)
    const instancia = await this.prisma.mod_categoria_calificacion.create({
      data: {
        ...(isMaster ? { moduloMaestroId: moduloId } : { moduloId: moduloId }),
        configId: config.id,
        turnoId: data.turnoId || null,
        estado: 'activo',
      },
      include: { config: true },
    });

    return {
      id: instancia.id,
      nombre: instancia.config.nombre,
      peso: instancia.config.peso,
      ponderacion: instancia.config.peso,
      esEvalFinal: instancia.config.esEvalFinal,
      configId: instancia.configId,
    };
  }

  /**
   * Aplica la plantilla de categorías del tipo de programa al módulo.
   * Lee mod_tipo_calificacion_config del tipo y crea instancias
   * en mod_categoria_calificacion para las que aún no existan.
   */
  async aplicarPlantilla(userId: string, moduloId: string, turnoId?: string) {
    const asignacion = await this.verifyFacilitador(userId, moduloId);

    const tipoId = asignacion.programaDos.tipoId;
    const configs = await this.prisma.mod_tipo_calificacion_config.findMany({
      where: { tipoProgramaId: tipoId, estado: 'activo' },
    });

    if (!configs.length) {
      throw new BadRequestException(
        'El tipo de programa no tiene categorías configuradas en el Dashboard. Pide al administrador que las configure primero.',
      );
    }

    // Obtener configIds ya instanciadas en este módulo Y TURNO
    const existentes = await this.prisma.mod_categoria_calificacion.findMany({
      where: {
        OR: [{ moduloId: moduloId }, { moduloMaestroId: moduloId }],
        turnoId: turnoId || null,
      },
      select: { configId: true },
    });
    const existentesSet = new Set(existentes.map((e) => e.configId));

    const nuevas = configs.filter((c) => !existentesSet.has(c.id));
    if (!nuevas.length) {
      return {
        mensaje:
          'Todas las categorías de la plantilla ya están aplicadas para este turno',
        aplicadas: 0,
        total: configs.length,
      };
    }

    const isMaster = await this.prisma.programaModulo.findUnique({
      where: { id: moduloId },
    });

    await this.prisma.mod_categoria_calificacion.createMany({
      data: nuevas.map((c) => ({
        ...(isMaster ? { moduloMaestroId: moduloId } : { moduloId: moduloId }),
        configId: c.id,
        turnoId: turnoId || null,
        estado: 'activo',
      })),
    });

    return {
      mensaje: `Se aplicaron ${nuevas.length} categorías al módulo`,
      aplicadas: nuevas.length,
      total: configs.length,
      categorias: nuevas.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        peso: c.peso,
      })),
    };
  }

  /**
   * Actualiza nombre y peso de una categoría del módulo.
   */
  async actualizarCategoria(
    userId: string,
    moduloId: string,
    id: string,
    data: { nombre?: string; peso?: number; esEvalFinal?: boolean },
  ) {
    await this.verifyFacilitador(userId, moduloId);

    const instancia = await this.prisma.mod_categoria_calificacion.findFirst({
      where: {
        id,
        OR: [{ moduloId: moduloId }, { moduloMaestroId: moduloId }],
        estado: 'activo',
      },
      include: { config: true },
    });
    if (!instancia)
      throw new NotFoundException('Categoría no encontrada en este módulo');

    if (data.peso !== undefined) {
      await this.validatePeso(
        moduloId,
        data.peso,
        id,
        instancia.turnoId || undefined,
      );
    }

    const updatedConfig = await this.prisma.mod_tipo_calificacion_config.update(
      {
        where: { id: instancia.configId },
        data: {
          ...(data.nombre !== undefined && { nombre: data.nombre }),
          ...(data.peso !== undefined && { peso: Number(data.peso) }),
          ...(data.esEvalFinal !== undefined && {
            esEvalFinal: data.esEvalFinal,
          }),
        },
      },
    );

    return {
      id: instancia.id,
      nombre: updatedConfig.nombre,
      peso: updatedConfig.peso,
      ponderacion: updatedConfig.peso,
      esEvalFinal: updatedConfig.esEvalFinal,
      configId: instancia.configId,
    };
  }

  /**
   * Soft-delete de una categoría del módulo.
   * Marca la instancia como inactiva.
   */
  async eliminarCategoria(userId: string, moduloId: string, id: string) {
    await this.verifyFacilitador(userId, moduloId);

    const instancia = await this.prisma.mod_categoria_calificacion.findFirst({
      where: {
        id,
        OR: [{ moduloId: moduloId }, { moduloMaestroId: moduloId }],
        estado: 'activo',
      },
    });
    if (!instancia) throw new NotFoundException('Categoría no encontrada');

    // Verificar que no haya actividades usando esta categoría
    const actividadesEnUso = await this.prisma.mod_actividad.count({
      where: { categoriaId: id, estado: { not: 'eliminado' } },
    });
    if (actividadesEnUso > 0) {
      throw new BadRequestException(
        `No se puede eliminar: hay ${actividadesEnUso} actividad(es) asignadas a esta categoría`,
      );
    }

    await this.prisma.mod_categoria_calificacion.update({
      where: { id },
      data: { estado: 'inactivo' },
    });

    return { mensaje: 'Categoría eliminada correctamente', id };
  }
}
