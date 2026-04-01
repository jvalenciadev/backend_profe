import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class AulaCategoriaService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // MOD_TIPO_CALIFICACION_CONFIG  —  Config global por TipoPrograma
  // ─────────────────────────────────────────────────────────────

  /**
   * Retorna todos los tipos de programa con sus categorías configuradas.
   */
  async getConfigByTipos() {
    const tipos = await this.prisma.programaTipo.findMany({
      where: { estado: 'activo' },
      include: {
        mod_tipos_calificacion: {
          where: { estado: 'activo' },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return tipos;
  }

  /**
   * Retorna las categorías configuradas para un tipo de programa específico.
   */
  async getConfigByTipoId(tipoProgramaId: string) {
    const configs = await this.prisma.mod_tipo_calificacion_config.findMany({
      where: { tipoProgramaId, estado: 'activo' },
      orderBy: { orden: 'asc' },
    });
    return configs;
  }

  /**
   * Crea una nueva categoría de calificación para un tipo de programa.
   */
  async createConfig(
    tipoProgramaId: string,
    data: {
      nombre: string;
      peso: number;
      esEvalFinal?: boolean;
      orden?: number;
    },
  ) {
    // Verificar que el tipo existe
    const tipo = await this.prisma.programaTipo.findUnique({
      where: { id: tipoProgramaId },
    });
    if (!tipo) throw new NotFoundException('Tipo de programa no encontrado');

    const maxNota = tipo.notaMaxima || 100;

    // Validar que el peso total no supere el máximo del tipo
    const existentes = await this.prisma.mod_tipo_calificacion_config.findMany({
      where: { tipoProgramaId, estado: 'activo' },
    });
    const pesoActual = existentes.reduce((sum, c) => sum + (c.peso || 0), 0);
    if (pesoActual + data.peso > maxNota) {
      throw new BadRequestException(
        `El puntaje total excede el máximo del tipo de programa (${maxNota}). Disponible: ${maxNota - pesoActual} pts`,
      );
    }

    return this.prisma.mod_tipo_calificacion_config.create({
      data: {
        tipoProgramaId,
        nombre: data.nombre,
        peso: data.peso,
        esEvalFinal: data.esEvalFinal ?? false,
        orden: data.orden ?? existentes.length,
        estado: 'activo',
      },
    });
  }

  /**
   * Actualiza una categoría de configuración existente.
   */
  async updateConfig(
    id: string,
    data: {
      nombre?: string;
      peso?: number;
      esEvalFinal?: boolean;
      orden?: number;
    },
  ) {
    const config = await this.prisma.mod_tipo_calificacion_config.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException('Configuración no encontrada');

    if (data.peso !== undefined) {
      const tipo = await this.prisma.programaTipo.findUnique({
        where: { id: config.tipoProgramaId },
      });
      const maxNota = tipo?.notaMaxima || 100;

      // Validar que el peso total ajustado no supere el máximo
      const existentes =
        await this.prisma.mod_tipo_calificacion_config.findMany({
          where: {
            tipoProgramaId: config.tipoProgramaId,
            estado: 'activo',
            id: { not: id },
          },
        });
      const pesoOtros = existentes.reduce((sum, c) => sum + (c.peso || 0), 0);
      if (pesoOtros + data.peso > maxNota) {
        throw new BadRequestException(
          `El puntaje total excede el máximo del tipo de programa (${maxNota}). Disponible: ${maxNota - pesoOtros} pts`,
        );
      }
    }

    return this.prisma.mod_tipo_calificacion_config.update({
      where: { id },
      data: {
        nombre: data.nombre,
        peso: data.peso,
        esEvalFinal: data.esEvalFinal,
        orden: data.orden,
      },
    });
  }

  /**
   * Elimina lógicamente una configuración de tipo (soft delete).
   */
  async deleteConfig(id: string) {
    const config = await this.prisma.mod_tipo_calificacion_config.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException('Configuración no encontrada');

    return this.prisma.mod_tipo_calificacion_config.update({
      where: { id },
      data: { estado: 'inactivo' },
    });
  }

  /**
   * Aplica la configuración de un tipo de programa a un módulo
   * (genera instancias en mod_categoria_calificacion).
   */
  async aplicarConfigAModulo(moduloId: string, tipoProgramaId: string) {
    let modulo: any = await this.prisma.programaModuloDos.findUnique({
      where: { id: moduloId },
    });
    if (!modulo) {
      modulo = await this.prisma.programaModulo.findUnique({
        where: { id: moduloId },
      });
    }
    if (!modulo) throw new NotFoundException('Módulo no encontrado');

    const configs = await this.prisma.mod_tipo_calificacion_config.findMany({
      where: { tipoProgramaId, estado: 'activo' },
    });
    if (!configs.length)
      throw new BadRequestException('No hay configuraciones para este tipo');

    // Crear instancias para el módulo (skip duplicados)
    const existentes = await this.prisma.mod_categoria_calificacion.findMany({
      where: {
        OR: [{ moduloId: moduloId }, { moduloMaestroId: moduloId }],
      },
      select: { configId: true },
    });
    const existentesSet = new Set(existentes.map((e) => e.configId));

    const nuevas = configs.filter((c) => !existentesSet.has(c.id));
    if (nuevas.length === 0) {
      throw new BadRequestException(
        'Todas las categorías ya están aplicadas a este módulo',
      );
    }

    const isMaster = await this.prisma.programaModulo.findUnique({
      where: { id: moduloId },
    });

    await this.prisma.mod_categoria_calificacion.createMany({
      data: nuevas.map((c) => ({
        ...(isMaster ? { moduloMaestroId: moduloId } : { moduloId: moduloId }),
        configId: c.id,
        estado: 'activo',
      })),
    });

    return { aplicadas: nuevas.length, total: configs.length };
  }

  // ─────────────────────────────────────────────────────────────
  // MOD_CATEGORIA_CALIFICACION  —  Instancias por módulo
  // ─────────────────────────────────────────────────────────────

  /**
   * Devuelve los módulos asignados al facilitador autenticado.
   */
  async getMateriaAsignada(userId: string) {
    return this.prisma.programaDosFacilitador.findMany({
      where: {
        facilitadorId: userId,
        estado: 'activo',
      },
      include: {
        programaDos: {
          include: {
            tipo: true,
            sede: true,
          },
        },
        modulo: true,
        turno: {
          include: {
            turnoConfig: true,
          },
        },
      },
    });
  }

  /**
   * Retorna todos los módulos del sistema (para admins del dashboard).
   */
  async getAllModulos(query?: { search?: string; tipoProgramaId?: string }) {
    const where: any = { estado: 'activo' };

    if (query?.tipoProgramaId) {
      where.programaDos = {
        tipoId: query.tipoProgramaId,
      };
    }

    if (query?.search) {
      where.OR = [{ nombre: { contains: query.search, mode: 'insensitive' } }];
    }

    return this.prisma.programaModuloDos.findMany({
      where,
      include: {
        programaDos: {
          include: {
            tipo: true,
            sede: true,
          },
        },
        mod_categorias_calif: {
          where: { estado: 'activo' },
          include: { config: true },
        },
      },
      orderBy: { nombre: 'asc' },
      take: 100,
    });
  }

  /**
   * Retorna las categorías de calificación activas para un módulo.
   */
  async findAll(moduloId: string) {
    const data = await this.prisma.mod_categoria_calificacion.findMany({
      where: {
        OR: [{ moduloId: moduloId }, { moduloMaestroId: moduloId }],
        estado: 'activo',
      },
      include: { config: true },
      orderBy: { config: { orden: 'asc' } },
    });

    return data.map((c) => ({
      id: c.id,
      nombre: c.config.nombre,
      peso: c.config.peso,
      ponderacion: c.config.peso,
      esEvalFinal: c.config.esEvalFinal,
      configId: c.configId,
      tipoProgramaId: c.config.tipoProgramaId,
    }));
  }

  /**
   * Crea una nueva categoría de calificación para el módulo
   * (también actualiza o crea el config del tipo si corresponde).
   */
  async create(
    moduloId: string,
    data: { nombre: string; ponderacion: number; esEvalFinal?: boolean },
  ) {
    let modulo: any = await this.prisma.programaModuloDos.findUnique({
      where: { id: moduloId },
      include: { programaDos: { include: { tipo: true } } },
    });

    let tipoId: string | undefined;
    let maxNota = 100;

    if (modulo) {
      tipoId = modulo.programaDos?.tipoId;
      maxNota = modulo.programaDos?.tipo?.notaMaxima || 100;
    } else {
      const master = await this.prisma.programaModulo.findUnique({
        where: { id: moduloId },
        include: { programa: { include: { tipo: true } } },
      });
      if (master) {
        tipoId = master.programa.tipoId;
        maxNota = (master.programa?.tipo as any)?.notaMaxima || 100;
        modulo = master;
      }
    }

    if (!modulo) throw new NotFoundException('Módulo no encontrado');
    if (!tipoId)
      throw new NotFoundException('El programa no tiene un tipo configurado');

    // Validar peso total en el módulo
    const existentes = await this.prisma.mod_categoria_calificacion.findMany({
      where: {
        OR: [{ moduloId: moduloId }, { moduloMaestroId: moduloId }],
        estado: 'activo',
      },
      include: { config: true },
    });
    const pesoActual = existentes.reduce(
      (sum, c) => sum + (c.config?.peso || 0),
      0,
    );
    if (pesoActual + data.ponderacion > maxNota) {
      throw new BadRequestException(
        `El puntaje total excede el máximo del programa (${maxNota}). Disponible: ${maxNota - pesoActual} pts`,
      );
    }

    // Crear config en el tipo de programa
    const config = await this.prisma.mod_tipo_calificacion_config.create({
      data: {
        tipoProgramaId: tipoId,
        nombre: data.nombre,
        peso: Number(data.ponderacion),
        esEvalFinal: data.esEvalFinal ?? false,
        orden: existentes.length,
        estado: 'activo',
      },
    });

    const isMaster = await this.prisma.programaModulo.findUnique({
      where: { id: moduloId },
    });

    return this.prisma.mod_categoria_calificacion.create({
      data: {
        ...(isMaster ? { moduloMaestroId: moduloId } : { moduloId: moduloId }),
        configId: config.id,
        estado: 'activo',
      },
      include: { config: true },
    });
  }

  /**
   * Actualiza el nombre y la ponderación de una categoría existente.
   */
  async update(
    id: string,
    data: { nombre?: string; ponderacion?: number; esEvalFinal?: boolean },
  ) {
    const categoria = await this.prisma.mod_categoria_calificacion.findUnique({
      where: { id },
      include: { config: true },
    });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');

    if (data.ponderacion !== undefined) {
      const targetId = categoria.moduloId || categoria.moduloMaestroId;
      if (!targetId) throw new BadRequestException('Categoría no definida');

      const modulo: any = await this.prisma.programaModuloDos.findUnique({
        where: { id: targetId },
        include: { programaDos: { include: { tipo: true } } },
      });

      let maxNota = 100;
      if (modulo) {
        maxNota = modulo.programaDos?.tipo?.notaMaxima || 100;
      } else {
        const master = await this.prisma.programaModulo.findUnique({
          where: { id: targetId },
          include: { programa: { include: { tipo: true } } },
        });
        if (master) maxNota = (master.programa?.tipo as any)?.notaMaxima || 100;
      }

      // Validar peso total (sin contar la actual)
      const existentes = await this.prisma.mod_categoria_calificacion.findMany({
        where: {
          OR: [{ moduloId: targetId }, { moduloMaestroId: targetId }],
          estado: 'activo',
          id: { not: id },
        },
        include: { config: true },
      });
      const pesoOtros = existentes.reduce(
        (sum, c) => sum + (c.config?.peso || 0),
        0,
      );
      if (pesoOtros + data.ponderacion > maxNota) {
        throw new BadRequestException(
          `El puntaje total excede el máximo del programa (${maxNota}). Disponible: ${maxNota - pesoOtros} pts`,
        );
      }
    }

    await this.prisma.mod_tipo_calificacion_config.update({
      where: { id: categoria.configId },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.ponderacion !== undefined && {
          peso: Number(data.ponderacion),
        }),
        ...(data.esEvalFinal !== undefined && {
          esEvalFinal: data.esEvalFinal,
        }),
      },
    });

    return this.findAll(
      (categoria.moduloId || categoria.moduloMaestroId) as string,
    );
  }

  /**
   * Desactiva lógicamente una categoría (soft delete).
   */
  async remove(id: string) {
    const categoria = await this.prisma.mod_categoria_calificacion.findUnique({
      where: { id },
    });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');

    return this.prisma.mod_categoria_calificacion.update({
      where: { id },
      data: { estado: 'inactivo' },
    });
  }
}
