import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  IEvaluacionRepository,
  CreatePeriodoData,
  CreateCuestionarioData,
  CreateAsignacionData,
  IniciarIntentoData,
  ResponderIntentoData,
} from '../../domain/repositories/evaluacion.repository.interface';
import {
  EvaluacionAdmin,
  EvaluacionPeriodo,
  EvaluacionCuestionario,
  EvaluacionCuestionarioCargo,
  EvaluacionCriterio,
  EvaluacionCriterioCargo,
  EvaluacionSubcriterio,
  EvaluacionOpcion,
  EvaluacionIntento,
  EvaluacionRespuesta,
  ESCALA_LIKERT_VALORES,
  EscalaLikertTexto,
  TipoPregunta,
} from '../../domain/entities/evaluacion.entity';

@Injectable()
export class PrismaEvaluacionRepository implements IEvaluacionRepository {
  constructor(private readonly prisma: PrismaService) { }

  private get db(): any {
    return this.prisma as any;
  }

  // ── PERIODOS ─────────────────────────────────────────────────────────────

  async createPeriodo(data: CreatePeriodoData): Promise<EvaluacionPeriodo> {
    const record = await this.db.evaluacionPeriodo.create({
      data: {
        periodo: data.periodo,
        gestion: data.gestion,
        semestre: data.semestre,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        criterios: data.criterios && data.criterios.length > 0 ? {
          create: data.criterios.map((c, i) => ({
            nombre: c.nombre,
            descripcion: c.descripcion,
            pesoPorcentaje: c.pesoPorcentaje ?? 0,
            orden: c.orden ?? i + 1,
            cargos: c.cargoIds && c.cargoIds.length > 0 ? {
              create: c.cargoIds.map(cargoId => ({ cargoId })),
            } : undefined,
            subcriterios: c.subcriterios && c.subcriterios.length > 0 ? {
              create: c.subcriterios.map((s, si) => ({
                codigo: s.codigo ?? `IND-${i + 1}.${si + 1}`,
                indicador: s.indicador,
                descripcion: s.descripcion,
                tipoPregunta: s.tipoPregunta ?? 'LIKERT',
                pesoPorcentaje: s.pesoPorcentaje ?? 0,
                orden: s.orden ?? si + 1,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: {
        criterios: {
          include: {
            cargos: { include: { cargo: true } },
            subcriterios: { orderBy: { orden: 'asc' } },
            cuestionarios: true,
          },
          orderBy: { orden: 'asc' },
        },
        cuestionarios: {
          include: {
            cargos: { include: { cargo: true } },
            criterio: true,
          },
        },
      },
    });
    return this.mapPeriodo(record);
  }

  async updatePeriodo(id: string, data: Partial<CreatePeriodoData>): Promise<EvaluacionPeriodo> {
    return this.db.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (data.periodo !== undefined) updateData.periodo = data.periodo;
      if (data.gestion !== undefined) updateData.gestion = data.gestion;
      if (data.semestre !== undefined) updateData.semestre = data.semestre;
      if (data.fechaInicio !== undefined) updateData.fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : null;
      if (data.fechaFin !== undefined) updateData.fechaFin = data.fechaFin ? new Date(data.fechaFin) : null;

      await tx.evaluacionPeriodo.update({
        where: { id },
        data: updateData,
      });

      if (data.criterios && Array.isArray(data.criterios)) {
        await tx.evaluacionCriterio.deleteMany({
          where: { periodoId: id },
        });

        for (let i = 0; i < data.criterios.length; i++) {
          const c = data.criterios[i];
          await tx.evaluacionCriterio.create({
            data: {
              periodoId: id,
              nombre: c.nombre,
              descripcion: c.descripcion,
              pesoPorcentaje: c.pesoPorcentaje ?? 0,
              orden: c.orden ?? i + 1,
              cargos: c.cargoIds && c.cargoIds.length > 0 ? {
                create: c.cargoIds.map((cargoId: string) => ({ cargoId })),
              } : undefined,
              subcriterios: c.subcriterios && c.subcriterios.length > 0 ? {
                create: c.subcriterios.map((s: any, si: number) => ({
                  codigo: s.codigo ?? `IND-${i + 1}.${si + 1}`,
                  indicador: s.indicador,
                  descripcion: s.descripcion,
                  tipoPregunta: s.tipoPregunta ?? 'LIKERT',
                  pesoPorcentaje: s.pesoPorcentaje ?? 0,
                  orden: s.orden ?? si + 1,
                })),
              } : undefined,
            },
          });
        }
      }

      const updated = await tx.evaluacionPeriodo.findUnique({
        where: { id },
        include: {
          criterios: {
            where: { estado: { not: 'eliminado' } },
            include: {
              cargos: { include: { cargo: true } },
              subcriterios: { where: { estado: { not: 'eliminado' } }, orderBy: { orden: 'asc' } },
              cuestionarios: true,
            },
            orderBy: { orden: 'asc' },
          },
          cuestionarios: {
            where: { estado: { not: 'eliminado' } },
            include: {
              cargos: { include: { cargo: true } },
              criterio: true,
            },
          },
        },
      });

      return this.mapPeriodo(updated);
    });
  }

  async findAllPeriodos(): Promise<EvaluacionPeriodo[]> {
    const records = await this.db.evaluacionPeriodo.findMany({
      where: { estado: { not: 'eliminado' } },
      include: {
        criterios: {
          where: { estado: { not: 'eliminado' } },
          include: {
            cargos: { include: { cargo: true } },
            subcriterios: { where: { estado: { not: 'eliminado' } }, orderBy: { orden: 'asc' } },
            cuestionarios: true,
          },
          orderBy: { orden: 'asc' },
        },
        cuestionarios: {
          where: { estado: { not: 'eliminado' } },
          include: {
            cargos: { include: { cargo: true } },
            criterio: true,
          },
        },
      },
      orderBy: [{ gestion: 'desc' }, { semestre: 'asc' }],
    });
    return records.map((r: any) => this.mapPeriodo(r));
  }

  async findPeriodoById(id: string): Promise<EvaluacionPeriodo | null> {
    const record = await this.db.evaluacionPeriodo.findFirst({
      where: { id, estado: { not: 'eliminado' } },
      include: {
        criterios: {
          where: { estado: { not: 'eliminado' } },
          include: {
            cargos: { include: { cargo: true } },
            subcriterios: { where: { estado: { not: 'eliminado' } }, orderBy: { orden: 'asc' } },
            cuestionarios: true,
          },
          orderBy: { orden: 'asc' },
        },
        cuestionarios: {
          where: { estado: { not: 'eliminado' } },
          include: {
            cargos: { include: { cargo: true } },
            criterio: true,
          },
        },
      },
    });
    return record ? this.mapPeriodo(record) : null;
  }

  async togglePeriodo(id: string, activo: boolean): Promise<EvaluacionPeriodo> {
    const record = await this.db.evaluacionPeriodo.update({
      where: { id },
      data: { activo },
      include: {
        criterios: {
          include: {
            cargos: { include: { cargo: true } },
            subcriterios: true,
            cuestionarios: true,
          },
        },
        cuestionarios: {
          include: {
            cargos: { include: { cargo: true } },
            criterio: true,
          },
        },
      },
    });
    return this.mapPeriodo(record);
  }

  async deletePeriodo(id: string): Promise<void> {
    await this.db.evaluacionPeriodo.update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
  }

  // ── CUESTIONARIOS & CRITERIOS ─────────────────────────────────────────────

  async createCuestionario(data: CreateCuestionarioData): Promise<EvaluacionCuestionario> {
    return this.db.$transaction(async (tx: any) => {
      let finalCriterioId = data.criterioId || null;

      // Si no se vinculó a un criterio existente pero tiene preguntas, crear un criterio dedicado para este cuestionario
      if (!finalCriterioId && data.preguntas && data.preguntas.length > 0) {
        const autoCrit = await tx.evaluacionCriterio.create({
          data: {
            periodoId: data.periodoId,
            nombre: data.titulo,
            descripcion: data.descripcion,
            pesoPorcentaje: 0,
            orden: 1,
          },
        });
        finalCriterioId = autoCrit.id;
      }

      // Guardar preguntas / subcriterios y sus opciones si existen
      if (finalCriterioId && data.preguntas && data.preguntas.length > 0) {
        for (let i = 0; i < data.preguntas.length; i++) {
          const p = data.preguntas[i];
          await tx.evaluacionSubcriterio.create({
            data: {
              criterioId: finalCriterioId,
              codigo: p.codigo ?? `PREG-${i + 1}`,
              indicador: p.indicador,
              descripcion: p.descripcion,
              tipoPregunta: p.tipoPregunta ?? 'OPCION_UNICA',
              pesoPorcentaje: p.pesoPorcentaje ?? 0,
              orden: p.orden ?? i + 1,
              opciones: p.opciones && p.opciones.length > 0 ? {
                create: p.opciones.map((o, oi) => ({
                  texto: o.texto,
                  esCorrecta: Boolean(o.esCorrecta),
                  orden: o.orden ?? oi + 1,
                })),
              } : undefined,
            },
          });
        }
      }

      const record = await tx.evaluacionCuestionario.create({
        data: {
          periodoId: data.periodoId,
          criterioId: finalCriterioId,
          titulo: data.titulo,
          descripcion: data.descripcion,
          tiempoLimiteMinutos: data.tiempoLimiteMinutos ?? null,
          maxIntentos: data.maxIntentos ?? 1,
          tipoCalculo: data.tipoCalculo ?? 'PROMEDIO_SIMPLE',
          notaMinima: data.notaMinima ?? 60.00,
          maxPreguntas: data.maxPreguntas !== undefined ? data.maxPreguntas : null,
          randomPreguntas: data.randomPreguntas ?? false,
          createdBy: data.createdBy,
          cargos: data.cargoIds && data.cargoIds.length > 0 ? {
            create: data.cargoIds.map((cId) => ({ cargoId: cId })),
          } : undefined,
        },
        include: {
          cargos: { include: { cargo: true } },
          criterio: {
            include: {
              subcriterios: {
                where: { estado: { not: 'eliminado' } },
                orderBy: { orden: 'asc' },
                include: { opciones: { orderBy: { orden: 'asc' } } },
              },
            },
          },
          periodo: true,
        },
      });
      return this.mapCuestionario(record);
    });
  }

  async updateCuestionario(id: string, data: Partial<CreateCuestionarioData>): Promise<EvaluacionCuestionario> {
    return this.db.$transaction(async (tx: any) => {
      if (data.cargoIds) {
        await tx.evaluacionCuestionarioCargo.deleteMany({ where: { cuestionarioId: id } });
        if (data.cargoIds.length > 0) {
          await tx.evaluacionCuestionarioCargo.createMany({
            data: data.cargoIds.map((cId) => ({ cuestionarioId: id, cargoId: cId })),
          });
        }
      }

      const current = await tx.evaluacionCuestionario.findUnique({ where: { id } });
      let finalCriterioId = data.criterioId !== undefined ? (data.criterioId || null) : current?.criterioId;

      // Si no tiene criterio pero tiene preguntas, crear uno
      if (!finalCriterioId && data.preguntas && data.preguntas.length > 0 && current) {
        const autoCrit = await tx.evaluacionCriterio.create({
          data: {
            periodoId: current.periodoId,
            nombre: data.titulo || current.titulo,
            descripcion: data.descripcion || current.descripcion,
            pesoPorcentaje: 0,
            orden: 1,
          },
        });
        finalCriterioId = autoCrit.id;
      }

      // Si se envían preguntas, sincronizar subcriterios y opciones
      if (finalCriterioId && data.preguntas && Array.isArray(data.preguntas)) {
        await tx.evaluacionSubcriterio.deleteMany({ where: { criterioId: finalCriterioId } });
        for (let i = 0; i < data.preguntas.length; i++) {
          const p = data.preguntas[i];
          await tx.evaluacionSubcriterio.create({
            data: {
              criterioId: finalCriterioId,
              codigo: p.codigo ?? `PREG-${i + 1}`,
              indicador: p.indicador,
              descripcion: p.descripcion,
              tipoPregunta: p.tipoPregunta ?? 'OPCION_UNICA',
              pesoPorcentaje: p.pesoPorcentaje ?? 0,
              orden: p.orden ?? i + 1,
              opciones: p.opciones && p.opciones.length > 0 ? {
                create: p.opciones.map((o, oi) => ({
                  texto: o.texto,
                  esCorrecta: Boolean(o.esCorrecta),
                  orden: o.orden ?? oi + 1,
                })),
              } : undefined,
            },
          });
        }
      }

      const updateData: any = {};
      if (data.titulo !== undefined) updateData.titulo = data.titulo;
      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
      if (finalCriterioId !== undefined) updateData.criterioId = finalCriterioId;
      if (data.tiempoLimiteMinutos !== undefined) updateData.tiempoLimiteMinutos = data.tiempoLimiteMinutos;
      if (data.maxIntentos !== undefined) updateData.maxIntentos = data.maxIntentos;
      if (data.tipoCalculo !== undefined) updateData.tipoCalculo = data.tipoCalculo;
      if (data.notaMinima !== undefined) updateData.notaMinima = data.notaMinima;
      if (data.maxPreguntas !== undefined) updateData.maxPreguntas = data.maxPreguntas;
      if (data.randomPreguntas !== undefined) updateData.randomPreguntas = data.randomPreguntas;
      if (data.estado !== undefined) updateData.estado = data.estado;

      const record = await tx.evaluacionCuestionario.update({
        where: { id },
        data: updateData,
        include: {
          cargos: { include: { cargo: true } },
          criterio: {
            include: {
              subcriterios: {
                where: { estado: { not: 'eliminado' } },
                orderBy: { orden: 'asc' },
                include: { opciones: { orderBy: { orden: 'asc' } } },
              },
            },
          },
          periodo: true,
        },
      });

      return this.mapCuestionario(record);
    });
  }

  async findCuestionarioById(id: string): Promise<EvaluacionCuestionario | null> {
    const record = await this.db.evaluacionCuestionario.findFirst({
      where: { id, estado: { not: 'eliminado' } },
      include: {
        cargos: { include: { cargo: true } },
        criterio: {
          include: {
            subcriterios: {
              where: { estado: { not: 'eliminado' } },
              orderBy: { orden: 'asc' },
              include: { opciones: { orderBy: { orden: 'asc' } } },
            },
            cargos: { include: { cargo: true } },
          },
        },
        periodo: true,
      },
    });
    return record ? this.mapCuestionario(record) : null;
  }

  async findAllCuestionarios(periodoId?: string): Promise<EvaluacionCuestionario[]> {
    const where: any = { estado: { not: 'eliminado' } };
    if (periodoId) where.periodoId = periodoId;

    const records = await this.db.evaluacionCuestionario.findMany({
      where,
      include: {
        cargos: { include: { cargo: true } },
        criterio: {
          include: {
            subcriterios: {
              where: { estado: { not: 'eliminado' } },
              orderBy: { orden: 'asc' },
              include: { opciones: { orderBy: { orden: 'asc' } } },
            },
            cargos: { include: { cargo: true } },
          },
        },
        periodo: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapCuestionario(r));
  }

  async findCuestionariosByCargo(cargoId: string, periodoId?: string): Promise<EvaluacionCuestionario[]> {
    const where: any = {
      estado: { not: 'eliminado' },
      cargos: { some: { cargoId } },
    };
    if (periodoId) where.periodoId = periodoId;

    const records = await this.db.evaluacionCuestionario.findMany({
      where,
      include: {
        cargos: { include: { cargo: true } },
        criterio: {
          include: {
            subcriterios: {
              where: { estado: { not: 'eliminado' } },
              orderBy: { orden: 'asc' },
              include: { opciones: { orderBy: { orden: 'asc' } } },
            },
            cargos: { include: { cargo: true } },
          },
        },
        periodo: true,
      },
    });
    return records.map((r: any) => this.mapCuestionario(r));
  }

  async deleteCuestionario(id: string): Promise<void> {
    await this.db.evaluacionCuestionario.update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
  }

  // ── ASIGNACIONES (QUIÉN EVALÚA A QUIÉN) ──────────────────────────────────

  async createAsignacion(data: CreateAsignacionData): Promise<EvaluacionAdmin> {
    // Si no se especifica cargoId, intentar obtenerlo del usuario evaluado
    let cargoId = data.cargoId;
    let tenantId = data.tenantId;

    if (!cargoId || !tenantId) {
      const evaluado = await this.db.user.findFirst({
        where: { id: data.evaluadoId },
        select: { cargoPostulacionId: true, tenantId: true },
      });
      if (!cargoId) cargoId = evaluado?.cargoPostulacionId ?? undefined;
      if (!tenantId) tenantId = evaluado?.tenantId ?? undefined;
    }

    // Si no se pasó cuestionarioId, buscar cuestionario activo para ese cargo en ese periodo
    let cuestionarioId = data.cuestionarioId;
    if (!cuestionarioId && cargoId) {
      const cuest = await this.db.evaluacionCuestionario.findFirst({
        where: {
          periodoId: data.periodoId,
          estado: 'activo',
          cargos: { some: { cargoId } },
        },
        select: { id: true },
      });
      cuestionarioId = cuest?.id;
    }

    const record = await this.db.evaluacionAdmins.create({
      data: {
        periodoId: data.periodoId,
        cuestionarioId,
        evaluadorId: data.evaluadorId,
        evaluadoId: data.evaluadoId,
        cargoId,
        tenantId,
        tipoEvaluacion: data.tipoEvaluacion ?? 'SUPERVISOR',
        createdBy: data.createdBy,
      },
      include: {
        evaluador: { select: { id: true, nombre: true, apellidos: true, correo: true, imagen: true } },
        evaluado: { select: { id: true, nombre: true, apellidos: true, correo: true, imagen: true, ci: true } },
        cargo: true,
        cuestionario: {
          include: {
            criterio: {
              include: {
                subcriterios: {
                  where: { estado: { not: 'eliminado' } },
                  include: { opciones: { orderBy: { orden: 'asc' } } },
                  orderBy: { orden: 'asc' },
                },
              },
            },
          },
        },
        periodo: true,
        intentos: true,
      },
    });

    return this.mapAsignacion(record);
  }

  async createAsignacionesMasivas(data: CreateAsignacionData[]): Promise<number> {
    let createdCount = 0;
    for (const item of data) {
      try {
        await this.createAsignacion(item);
        createdCount++;
      } catch (error) {
        // Ignorar duplicados o registros ya existentes
      }
    }
    return createdCount;
  }

  async findAsignacionesByEvaluador(evaluadorId: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
    const where: any = {
      evaluadorId,
      estado: { not: 'eliminado' },
      tipoEvaluacion: { not: 'AUTOEVALUACION' },
      evaluadoId: { not: evaluadorId },
    };
    if (periodoId) where.periodoId = periodoId;

    const records = await this.db.evaluacionAdmins.findMany({
      where,
      include: {
        evaluador: { select: { id: true, nombre: true, apellidos: true, correo: true, imagen: true } },
        evaluado: { select: { id: true, nombre: true, apellidos: true, correo: true, imagen: true, ci: true } },
        cargo: true,
        cuestionario: {
          include: {
            criterio: {
              include: {
                subcriterios: {
                  where: { estado: { not: 'eliminado' } },
                  include: { opciones: { orderBy: { orden: 'asc' } } },
                  orderBy: { orden: 'asc' },
                },
              },
            },
          },
        },
        periodo: true,
        intentos: {
          include: { respuestas: { include: { subcriterio: true } } },
          orderBy: { numeroIntento: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapAsignacion(r));
  }

  async findAsignacionesByEvaluado(evaluadoId: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
    const where: any = { evaluadoId, estado: { not: 'eliminado' } };
    if (periodoId) where.periodoId = periodoId;

    const includeOptions = {
      evaluador: { select: { id: true, nombre: true, apellidos: true, correo: true, imagen: true } },
      evaluado: { select: { id: true, nombre: true, apellidos: true, correo: true, imagen: true, ci: true } },
      cargo: true,
      cuestionario: {
        include: {
          criterio: {
            include: {
              subcriterios: {
                where: { estado: { not: 'eliminado' } },
                include: {
                  opciones: {
                    select: { id: true, texto: true, orden: true, subcriterioId: true },
                    orderBy: { orden: 'asc' as const },
                  },
                },
                orderBy: { orden: 'asc' as const },
              },
            },
          },
        },
      },
      periodo: true,
      intentos: {
        include: { respuestas: { include: { subcriterio: true } } },
        orderBy: { numeroIntento: 'desc' as const },
      },
    };

    const records = await this.db.evaluacionAdmins.findMany({
      where,
      include: includeOptions,
      orderBy: { createdAt: 'desc' },
    });

    // Auto-generar asignación de autoevaluación / examen personal si no existe aún para el cuestionario activo
    if (periodoId) {
      const user = await this.db.user.findUnique({
        where: { id: evaluadoId },
        select: { cargoPostulacionId: true, tenantId: true },
      });
      if (user?.cargoPostulacionId) {
        const cuestionariosCargo = await this.db.evaluacionCuestionario.findMany({
          where: {
            periodoId,
            estado: 'activo',
            cargos: { some: { cargoId: user.cargoPostulacionId } },
          },
        });
        for (const cuest of cuestionariosCargo) {
          const existeAuto = records.find(r => r.cuestionarioId === cuest.id && (r.tipoEvaluacion === 'AUTOEVALUACION' || r.evaluadorId === evaluadoId));
          if (!existeAuto) {
            try {
              const nuevaAuto = await this.db.evaluacionAdmins.create({
                data: {
                  periodoId,
                  cuestionarioId: cuest.id,
                  evaluadorId: evaluadoId,
                  evaluadoId: evaluadoId,
                  cargoId: user.cargoPostulacionId,
                  tenantId: user.tenantId,
                  tipoEvaluacion: 'AUTOEVALUACION',
                },
                include: includeOptions,
              });
              records.push(nuevaAuto);
            } catch (err) {
              // Ignorar si ya fue creada concurrentemente
            }
          }
        }
      }
    }

    return records.map((r: any) => this.mapAsignacion(r));
  }

  async findAsignacionById(id: string): Promise<EvaluacionAdmin | null> {
    const record = await this.db.evaluacionAdmins.findFirst({
      where: { id, estado: { not: 'eliminado' } },
      include: {
        evaluador: { select: { id: true, nombre: true, apellidos: true, correo: true, imagen: true } },
        evaluado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            correo: true,
            imagen: true,
            ci: true,
            sedes: { include: { sede: true } },
          },
        },
        cargo: true,
        cuestionario: {
          include: {
            criterio: {
              include: {
                subcriterios: {
                  where: { estado: { not: 'eliminado' } },
                  include: {
                    opciones: {
                      // Seguridad: NO se devuelve esCorrecta al cliente durante el examen
                      select: { id: true, texto: true, orden: true, subcriterioId: true },
                      orderBy: { orden: 'asc' },
                    },
                  },
                  orderBy: { orden: 'asc' },
                },
              },
            },
          },
        },
        periodo: true,
        intentos: {
          include: {
            respuestas: {
              include: { subcriterio: true },
            },
          },
          orderBy: { numeroIntento: 'asc' },
        },
      },
    });
    return record ? this.mapAsignacion(record) : null;
  }

  async findAllAsignaciones(tenantId?: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
    const where: any = { estado: { not: 'eliminado' } };
    if (tenantId) where.tenantId = tenantId;
    if (periodoId) where.periodoId = periodoId;

    const records = await this.db.evaluacionAdmins.findMany({
      where,
      include: {
        evaluador: { select: { id: true, nombre: true, apellidos: true, correo: true } },
        evaluado: { select: { id: true, nombre: true, apellidos: true, correo: true, ci: true } },
        cargo: true,
        cuestionario: true,
        periodo: true,
        intentos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapAsignacion(r));
  }

  async deleteAsignacion(id: string): Promise<void> {
    await this.db.evaluacionAdmins.update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
  }

  // ── INTENTOS Y RESPUESTAS (TEMPORIZADOR Y CÁLCULO) ─────────────────────────

  async iniciarIntento(data: IniciarIntentoData): Promise<EvaluacionIntento> {
    let asignacion = await this.db.evaluacionAdmins.findUnique({
      where: { id: data.evaluacionAdminId },
      include: {
        cuestionario: true,
        intentos: {
          include: { respuestas: { include: { subcriterio: true } } },
          orderBy: { numeroIntento: 'desc' },
        },
      },
    });

    if (!asignacion) throw new NotFoundException('Asignación de evaluación no encontrada');

    // Si la asignación pasada es de un supervisor y el evaluado rinde su examen personal, enrutar a AUTOEVALUACION
    if (asignacion.tipoEvaluacion === 'SUPERVISOR' && asignacion.evaluadorId !== asignacion.evaluadoId) {
      let autoAsig = await this.db.evaluacionAdmins.findFirst({
        where: {
          periodoId: asignacion.periodoId,
          evaluadoId: asignacion.evaluadoId,
          tipoEvaluacion: 'AUTOEVALUACION',
          estado: { not: 'eliminado' },
        },
        include: {
          cuestionario: true,
          intentos: {
            include: { respuestas: { include: { subcriterio: true } } },
            orderBy: { numeroIntento: 'desc' },
          },
        },
      });

      if (!autoAsig) {
        autoAsig = await this.db.evaluacionAdmins.create({
          data: {
            periodoId: asignacion.periodoId,
            cuestionarioId: asignacion.cuestionarioId,
            evaluadorId: asignacion.evaluadoId,
            evaluadoId: asignacion.evaluadoId,
            cargoId: asignacion.cargoId,
            tenantId: asignacion.tenantId,
            tipoEvaluacion: 'AUTOEVALUACION',
          },
          include: {
            cuestionario: true,
            intentos: {
              include: { respuestas: { include: { subcriterio: true } } },
              orderBy: { numeroIntento: 'desc' },
            },
          },
        });
      }
      asignacion = autoAsig;
    }

    // 1. Si la asignación es de supervisión y ya está COMPLETADA o tiene intentos finalizados, retornar el último intento con sus respuestas
    if (asignacion.tipoEvaluacion === 'SUPERVISOR' && asignacion.intentos.length > 0) {
      const intentoExistente = asignacion.intentos.find((i: any) => i.estado === 'EN_CURSO') || asignacion.intentos[0];
      if (intentoExistente) {
        return this.mapIntento(intentoExistente);
      }
    }

    const tiempoLimiteMinutos = asignacion.cuestionario?.tiempoLimiteMinutos ?? null;
    const ahora = new Date();

    // 2. Si ya existe un intento en curso, validar tiempo del servidor y devolverlo
    const intentoEnCurso = asignacion.intentos.find((i: any) => i.estado === 'EN_CURSO');
    if (intentoEnCurso) {
      const segundosTranscurridos = Math.max(0, Math.floor((ahora.getTime() - new Date(intentoEnCurso.fechaInicio).getTime()) / 1000));
      
      // Si el cuestionario tiene límite y ya venció en el servidor:
      if (tiempoLimiteMinutos && tiempoLimiteMinutos > 0) {
        const totalSegundos = tiempoLimiteMinutos * 60;
        if (segundosTranscurridos >= totalSegundos) {
          const intentoExpirado = await this.db.evaluacionIntento.update({
            where: { id: intentoEnCurso.id },
            data: {
              estado: 'EXPIRADO_POR_TIEMPO',
              fechaFin: ahora,
              tiempoEmpleadoSegundos: totalSegundos,
            },
            include: { respuestas: { include: { subcriterio: true } } },
          });
          await this.db.evaluacionAdmins.update({
            where: { id: asignacion.id },
            data: { estadoEvaluacion: 'COMPLETADO' },
          });
          return this.mapIntento(intentoExpirado);
        }
      }

      intentoEnCurso.tiempoEmpleadoSegundos = segundosTranscurridos;
      return this.mapIntento(intentoEnCurso);
    }

    const maxIntentos = asignacion.cuestionario?.maxIntentos ?? 1;
    const intentosPrevios = asignacion.intentos.length;

    // 3. Si ya alcanzó el máximo de intentos, retornar el último intento existente para permitir revisión
    if (intentosPrevios >= maxIntentos && asignacion.intentos.length > 0) {
      const ultimoIntento = asignacion.intentos[0]; // el más reciente por desc
      return this.mapIntento(ultimoIntento);
    }

    // 3. Crear nuevo intento
    const nuevoIntento = await this.db.evaluacionIntento.create({
      data: {
        evaluacionAdminId: data.evaluacionAdminId,
        numeroIntento: intentosPrevios + 1,
        fechaInicio: new Date(),
        estado: 'EN_CURSO',
      },
      include: {
        respuestas: { include: { subcriterio: true } },
      },
    });

    // Actualizar estado de asignación
    await this.db.evaluacionAdmins.update({
      where: { id: data.evaluacionAdminId },
      data: { estadoEvaluacion: 'EN_PROCESO' },
    });

    return this.mapIntento(nuevoIntento);
  }

  async findIntentoById(id: string): Promise<EvaluacionIntento | null> {
    const record = await this.db.evaluacionIntento.findUnique({
      where: { id },
      include: {
        respuestas: { include: { subcriterio: true } },
        evaluacionAdmin: {
          include: {
            cuestionario: {
              include: {
                criterio: {
                  include: {
                    subcriterios: {
                      where: { estado: { not: 'eliminado' } },
                      include: { opciones: { orderBy: { orden: 'asc' } } },
                      orderBy: { orden: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return record ? this.mapIntento(record) : null;
  }

  async findIntentosByAsignacion(asignacionId: string): Promise<EvaluacionIntento[]> {
    const records = await this.db.evaluacionIntento.findMany({
      where: { evaluacionAdminId: asignacionId },
      include: { respuestas: { include: { subcriterio: true } } },
      orderBy: { numeroIntento: 'asc' },
    });
    return records.map((r: any) => this.mapIntento(r));
  }

  async guardarRespuestasYCalcular(data: ResponderIntentoData): Promise<{
    intento: EvaluacionIntento;
    puntajeCalculado: number;
    asignacionActualizada: EvaluacionAdmin;
  }> {
    return this.db.$transaction(async (tx: any) => {
      const intento = await tx.evaluacionIntento.findUnique({
        where: { id: data.intentoId },
        include: {
          evaluacionAdmin: {
            include: {
              cuestionario: {
                include: {
                  criterio: {
                    include: { subcriterios: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!intento) throw new NotFoundException('Intento no encontrado');

      // Validar tiempo límite solo si aplica a un examen/cuestionario personal (autoevaluación)
      const esExamenAutonomo = intento.evaluacionAdmin?.tipoEvaluacion === 'AUTOEVALUACION' || intento.evaluacionAdmin?.evaluadorId === intento.evaluacionAdmin?.evaluadoId;
      const tiempoLimite = esExamenAutonomo ? intento.evaluacionAdmin?.cuestionario?.tiempoLimiteMinutos : null;
      const ahora = new Date();
      if (tiempoLimite && tiempoLimite > 0) {
        const diffMinutos = (ahora.getTime() - new Date(intento.fechaInicio).getTime()) / (1000 * 60);
        if (diffMinutos > tiempoLimite + 1) { // 1 min de tolerancia
          await tx.evaluacionIntento.update({
            where: { id: data.intentoId },
            data: { estado: 'EXPIRADO_POR_TIEMPO', fechaFin: ahora },
          });
          throw new BadRequestException('El tiempo límite para completar la evaluación ha expirado');
        }
      }

      // Upsert de respuestas con calificación segura en el servidor
      for (const r of data.respuestas) {
        let valorPuntaje = 0;
        if (ESCALA_LIKERT_VALORES[r.escalaTexto as EscalaLikertTexto] !== undefined) {
          valorPuntaje = ESCALA_LIKERT_VALORES[r.escalaTexto as EscalaLikertTexto];
        } else {
          const subcriterio = await tx.evaluacionSubcriterio.findUnique({
            where: { id: r.subcriterioId },
            include: { opciones: true },
          });

          if (subcriterio && subcriterio.opciones && subcriterio.opciones.length > 0) {
            const opcionCorrecta = subcriterio.opciones.find((o: any) => o.esCorrecta);
            if (opcionCorrecta) {
              const matched = opcionCorrecta.id === r.escalaTexto || 
                              opcionCorrecta.texto?.trim().toLowerCase() === r.escalaTexto?.trim().toLowerCase();
              valorPuntaje = matched ? 100 : 0;
            }
          } else {
            valorPuntaje = Number(r.puntaje) || 0;
          }
        }

        await tx.evaluacionRespuesta.upsert({
          where: {
            intentoId_subcriterioId: {
              intentoId: data.intentoId,
              subcriterioId: r.subcriterioId,
            },
          },
          create: {
            intentoId: data.intentoId,
            subcriterioId: r.subcriterioId,
            escalaTexto: r.escalaTexto,
            puntaje: valorPuntaje,
            observacion: r.observacion,
          },
          update: {
            escalaTexto: r.escalaTexto,
            puntaje: valorPuntaje,
            observacion: r.observacion,
          },
        });
      }

      // Obtener todas las respuestas del intento
      const allRespuestas = await tx.evaluacionRespuesta.findMany({
        where: { intentoId: data.intentoId },
      });

      // Cálculo de promedios:
      // Si tipoCalculo es PONDERADO y los criterios/subcriterios tienen peso
      const cuestionario = intento.evaluacionAdmin.cuestionario;
      let puntajeCalculado = 0;

      if (allRespuestas.length > 0) {
        if (cuestionario?.tipoCalculo === 'PONDERADO' && cuestionario?.criterio) {
          // Promedio ponderado: el criterio único del cuestionario tiene su peso
          const crit = cuestionario.criterio;
          const subcritIds = (crit.subcriterios || []).map((s: any) => s.id);
          const respuestasCrit = allRespuestas.filter((r: any) => subcritIds.includes(r.subcriterioId));

          if (respuestasCrit.length > 0) {
            const sumaSubcrit = respuestasCrit.reduce((acc: number, cur: any) => acc + cur.puntaje, 0);
            puntajeCalculado = Math.round((sumaSubcrit / respuestasCrit.length) * 100) / 100;
          }
        } else {
          // PROMEDIO SIMPLE directo de todos los subcriterios respondidos
          const sumaTotal = allRespuestas.reduce((acc: number, cur: any) => acc + cur.puntaje, 0);
          puntajeCalculado = Math.round((sumaTotal / allRespuestas.length) * 100) / 100;
        }
      }

      const tiempoEmpleadoSegundos = Math.floor((ahora.getTime() - new Date(intento.fechaInicio).getTime()) / 1000);
      const isFinalizado = data.finalizar ?? false;

      // Actualizar intento
      const updatedIntento = await tx.evaluacionIntento.update({
        where: { id: data.intentoId },
        data: {
          puntajeObtenido: puntajeCalculado,
          tiempoEmpleadoSegundos,
          fechaFin: isFinalizado ? ahora : null,
          estado: isFinalizado ? 'FINALIZADO' : 'EN_CURSO',
        },
        include: { respuestas: { include: { subcriterio: true } } },
      });

      // Actualizar asignación
      const updatedAsignacion = await tx.evaluacionAdmins.update({
        where: { id: intento.evaluacionAdminId },
        data: {
          puntajeFinal: puntajeCalculado,
          estadoEvaluacion: isFinalizado ? 'COMPLETADO' : 'EN_PROCESO',
        },
        include: {
          evaluador: { select: { id: true, nombre: true, apellidos: true, correo: true } },
          evaluado: { select: { id: true, nombre: true, apellidos: true, correo: true } },
          cargo: true,
          cuestionario: true,
          periodo: true,
          intentos: true,
        },
      });

      return {
        intento: this.mapIntento(updatedIntento),
        puntajeCalculado,
        asignacionActualizada: this.mapAsignacion(updatedAsignacion),
      };
    });
  }

  // ── CONSOLIDADO Y COMPATIBILIDAD ──────────────────────────────────────────

  async findByVerificationCode(code: string): Promise<EvaluacionAdmin | null> {
    const record = await this.db.evaluacionAdmins.findFirst({
      where: { codigoVerificacion: code, estado: { not: 'eliminado' } },
      include: {
        evaluador: { select: { nombre: true, apellidos: true, username: true } },
        evaluado: { select: { nombre: true, apellidos: true, username: true } },
        periodo: true,
        cuestionario: true,
        intentos: { include: { respuestas: true } },
      },
    });
    return record ? this.mapAsignacion(record) : null;
  }

  async findUsersToEvaluate(tenantId?: string, periodoId?: string): Promise<any[]> {
    const where: any = { estado: 'activo' };
    if (tenantId) where.tenantId = tenantId;

    return this.db.user.findMany({
      where: {
        ...where,
        roles: {
          none: {
            role: {
              name: {
                in: ['PARTICIPANTE', 'ESTUDIANTE'],
                mode: 'insensitive',
              },
            },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        username: true,
        correo: true,
        imagen: true,
        cargoStr: true,
        cargoPostulacion: true,
        roles: { include: { role: true } },
        evaluacionesRecibidas: periodoId
          ? {
            where: { periodoId, estado: { not: 'eliminado' } },
            include: {
              evaluador: { select: { id: true, nombre: true, apellidos: true } },
              cuestionario: true,
              intentos: true,
            },
          }
          : false,
      },
    });
  }

  async getConsolidadoEvaluado(evaluadoId: string, periodoId: string): Promise<{
    evaluado: any;
    periodo: EvaluacionPeriodo;
    evaluaciones: EvaluacionAdmin[];
    promedioGlobal: number;
    totalEvaluadores: number;
  }> {
    const evaluado = await this.db.user.findUnique({
      where: { id: evaluadoId },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        correo: true,
        cargoStr: true,
        ci: true,
        cargoPostulacion: true,
        tenant: true,
      },
    });

    if (!evaluado) throw new NotFoundException('Evaluado no encontrado');

    const periodo = await this.findPeriodoById(periodoId);
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    const evaluaciones = await this.findAsignacionesByEvaluado(evaluadoId, periodoId);
    const evaluacionesCompletadas = evaluaciones.filter((e) => e.estadoEvaluacion === 'COMPLETADO' && e.puntajeFinal !== null);

    let promedioGlobal = 0;
    if (evaluacionesCompletadas.length > 0) {
      const suma = evaluacionesCompletadas.reduce((acc, cur) => acc + Number(cur.puntajeFinal), 0);
      promedioGlobal = Math.round((suma / evaluacionesCompletadas.length) * 100) / 100;
    }

    return {
      evaluado,
      periodo,
      evaluaciones,
      promedioGlobal,
      totalEvaluadores: evaluaciones.length,
    };
  }

  // ── MAPPERS ───────────────────────────────────────────────────────────────

  private mapPeriodo(record: any): EvaluacionPeriodo {
    return new EvaluacionPeriodo(
      record.id,
      record.periodo,
      record.gestion,
      record.semestre,
      record.fechaInicio,
      record.fechaFin,
      record.activo,
      record.estado,
      record.cuestionarios ? record.cuestionarios.map((c: any) => this.mapCuestionario(c)) : undefined,
      record.criterios ? record.criterios.map((cr: any) => this.mapCriterio(cr)) : undefined,
    );
  }

  private mapCuestionario(record: any): EvaluacionCuestionario {
    return new EvaluacionCuestionario(
      record.id,
      record.periodoId,
      record.titulo,
      record.descripcion,
      record.tiempoLimiteMinutos,
      record.maxIntentos,
      record.tipoCalculo,
      Number(record.notaMinima),
      record.estado,
      record.criterioId,
      record.cargos ? record.cargos.map((c: any) => new EvaluacionCuestionarioCargo(c.id, c.cuestionarioId, c.cargoId, c.cargo)) : undefined,
      record.criterio ? this.mapCriterio(record.criterio) : undefined,
      record.periodo ? this.mapPeriodo(record.periodo) : undefined,
      record.maxPreguntas !== undefined && record.maxPreguntas !== null ? Number(record.maxPreguntas) : null,
      record.randomPreguntas !== undefined ? Boolean(record.randomPreguntas) : false,
    );
  }

  private mapCriterio(record: any): EvaluacionCriterio {
    return new EvaluacionCriterio(
      record.id,
      record.periodoId,
      record.nombre,
      record.descripcion,
      Number(record.pesoPorcentaje),
      record.orden,
      record.estado,
      record.cargos ? record.cargos.map((cg: any) => new EvaluacionCriterioCargo(cg.id, cg.criterioId, cg.cargoId, cg.cargo)) : undefined,
      record.subcriterios ? record.subcriterios.map((s: any) => new EvaluacionSubcriterio(
        s.id,
        s.criterioId,
        s.codigo,
        s.indicador,
        s.descripcion,
        (s.tipoPregunta as TipoPregunta) ?? 'LIKERT',
        Number(s.pesoPorcentaje),
        s.orden,
        s.estado,
        s.opciones ? s.opciones.map((o: any) => new EvaluacionOpcion(
          o.id,
          o.subcriterioId,
          o.texto,
          o.esCorrecta,
          o.orden,
        )) : [],
      )) : undefined,
      record.cuestionarios ? record.cuestionarios.map((c: any) => this.mapCuestionario(c)) : undefined,
    );
  }

  private mapAsignacion(record: any): EvaluacionAdmin {
    return new EvaluacionAdmin(
      record.id,
      record.periodoId,
      record.cuestionarioId,
      record.evaluadorId,
      record.evaluadoId,
      record.cargoId,
      record.tenantId,
      record.tipoEvaluacion,
      record.estadoEvaluacion,
      record.puntajeFinal !== null ? Number(record.puntajeFinal) : null,
      record.codigoVerificacion,
      record.qrCode,
      record.observaciones,
      record.estado,
      record.evaluador,
      record.evaluado,
      record.cargo,
      record.cuestionario ? this.mapCuestionario(record.cuestionario) : undefined,
      record.periodo ? this.mapPeriodo(record.periodo) : undefined,
      record.intentos ? record.intentos.map((i: any) => this.mapIntento(i)) : undefined,
    );
  }

  private mapIntento(record: any): EvaluacionIntento {
    return new EvaluacionIntento(
      record.id,
      record.evaluacionAdminId,
      record.numeroIntento,
      record.fechaInicio,
      record.fechaFin,
      record.tiempoEmpleadoSegundos,
      record.puntajeObtenido !== null ? Number(record.puntajeObtenido) : null,
      record.estado,
      record.respuestas ? record.respuestas.map((r: any) => new EvaluacionRespuesta(
        r.id,
        r.intentoId,
        r.subcriterioId,
        r.escalaTexto,
        r.puntaje,
        r.observacion,
        r.subcriterio,
      )) : undefined,
    );
  }
}
