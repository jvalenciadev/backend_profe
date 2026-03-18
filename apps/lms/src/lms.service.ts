import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { NotificacionesService } from './notificaciones/notificaciones.service';

@Injectable()
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notiService: NotificacionesService,
  ) { }

  /**
   * Login exclusivo para el Aula Virtual (LMS)
   */
  async login(username: string, pass: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { correo: username }],
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    // Solo roles permitidos en el aula
    const roles = user.roles.map(ur => ur.role.name);
    const ALLOWED_ROLES = ['PARTICIPANTE', 'FACILITADOR', 'ADMIN'];
    const canAccess = roles.some(r => ALLOWED_ROLES.includes(r.toUpperCase()));

    if (!canAccess) throw new UnauthorizedException('No tiene permisos para acceder al Aula Virtual');

    // Validación de estado de inscripciones para PARTICIPANTE puro
    if (roles.includes('PARTICIPANTE') && !roles.some(r => ['ADMIN', 'FACILITADOR'].includes(r))) {
      const inscripciones = await this.prisma.programaInscripcion.findMany({
        where: { personaId: user.id },
        include: { estadoInscripcion: true }
      });

      if (inscripciones.length === 0) {
        throw new UnauthorizedException('No tiene ninguna inscripción registrada en ningún programa.');
      }

      // Verificamos si tiene al menos una inscripción que lo habilite (INSCRITO)
      const INSCRITO_ID = '89da2cd1-ac47-41fb-9f48-5850128d78db';
      const CONFIRMADO_ID = 'adfbbf09-a486-4b79-8fe0-04cf85d83cae';

      const habilitado = inscripciones.some(ins =>
        ins.estadoInscripcionId === INSCRITO_ID ||
        ins.estadoInscripcionId === CONFIRMADO_ID
      );

      if (!habilitado) {
        // Encontrar el estado predominante si no está habilitado para ser específicos.
        const estadosStr = inscripciones.map(i => i.estadoInscripcion.nombre.toUpperCase());

        if (estadosStr.includes('PREINSCRITO')) {
          throw new UnauthorizedException('Aún no está habilitado para el Aula Virtual. Le enviaremos un correo electrónico cuando su preinscripción sea revisada y validada a INSCRITO.');
        } else if (estadosStr.includes('HABILITACIÓN DE PAGO')) {
          throw new UnauthorizedException('Su inscripción se encuentra retenida en verificación de HABILITACIÓN DE PAGO. Por favor sea paciente.');
        } else if (estadosStr.includes('BAJA')) {
          throw new UnauthorizedException('Usted ha sido dado de BAJA de su(s) programa(s). Contacte a coordinación.');
        } else if (estadosStr.includes('INHABILITADO')) {
          throw new UnauthorizedException('Usted se encuentra INHABILITADO en el sistema de este programa.');
        } else if (estadosStr.includes('DEVOLUCIÓN')) {
          throw new UnauthorizedException('Su trámite se encuentra en DEVOLUCIÓN.');
        } else {
          throw new UnauthorizedException(`Su estado actual de inscripción es: ${estadosStr[0]}. No tiene acceso permitido por ahora.`);
        }
      }
    }

    const payload = {
      username: user.username,
      sub: user.id,
      roles: roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        roles: roles,
        imagen: user.imagen,
      },
    };
  }

  async getDocencia(userId: string) {
    // 1. Asignaciones operativas (programaDosFacilitador) — solo las que tienen programaDosId
    const base = await this.prisma.programaDosFacilitador.findMany({
      where: { facilitadorId: userId, estado: 'activo' },
      select: {
        id: true,
        programaDosId: true,
        moduloId: true,
        moduloMaestroId: true,
        turnoId: true,
        facilitadorId: true,
        estado: true,
        createdAt: true,
      }
    });

    // 2. Módulos globales donde el facilitador está directamente asignado (programa_modulo.fac_id)
    const globalMasterModulos = await this.prisma.programaModulo.findMany({
      where: { facilitadorId: userId, esGlobal: true, estado: 'activo' },
      include: { programa: true }
    });

    // Construir entradas virtuales para cada módulo global (una por módulo maestro)
    const globalMaestroIds = new Set<string>(globalMasterModulos.map(m => m.id));
    const virtualGlobalAssignments: any[] = globalMasterModulos.map(ma => ({
      id: `global-${ma.id}`,
      programaDosId: null,
      moduloId: null,
      moduloMaestroId: ma.id,
      turnoId: null,
      facilitadorId: userId,
      estado: 'activo',
      isGlobalMaster: true,
      _masterModulo: ma,
    }));

    // También incluir globales desde programaDosFacilitador.moduloMaestroId (si no ya están)
    for (const d of base.filter(b => b.moduloMaestroId && !b.programaDosId)) {
      if (!globalMaestroIds.has(d.moduloMaestroId!)) {
        globalMaestroIds.add(d.moduloMaestroId!);
        virtualGlobalAssignments.push({
          id: `global-base-${d.id}`,
          programaDosId: null,
          moduloId: null,
          moduloMaestroId: d.moduloMaestroId,
          turnoId: null,
          facilitadorId: userId,
          estado: 'activo',
          isGlobalMaster: true,
          _masterModulo: null,
        });
      }
    }

    // Solo asignaciones regulares (con programaDosId)
    const baseRegular = base.filter(d => !!d.programaDosId);
    const allAssignments = [...baseRegular, ...virtualGlobalAssignments];

    // Hidratar cada registro individualmente de forma segura
    const results = await Promise.all(allAssignments.map(async (d) => {
      try {
        let programaDos: any = null;
        let studentCount = 0;

        if (d.programaDosId) {
          // ── MÓDULO OPERATIVO (programaModuloDos) ──
          programaDos = await this.prisma.programaDos.findUnique({
            where: { id: d.programaDosId },
            include: {
              tipo: { select: { id: true, nombre: true, notaMaxima: true, notaReprobacion: true } },
              sede: true,
              inscripciones: {
                where: {
                  estado: { in: ['activo', 'aprobado'] },
                  ...(d.turnoId ? { turnoId: d.turnoId } : {})
                },
                select: { id: true }
              }
            }
          }).catch(() => null);
          studentCount = programaDos?.inscripciones?.length ?? 0;
        } else if (d.moduloMaestroId && d.isGlobalMaster) {
          // ── MÓDULO GLOBAL (programaModulo isGlobal) ──
          // Usar el dato ya cargado si está disponible, si no buscar
          const master = d._masterModulo ?? await this.prisma.programaModulo.findUnique({
            where: { id: d.moduloMaestroId },
            include: { programa: true }
          }).catch(() => null);

          if (master) {
            // Contar inscritos en TODAS las ofertas del programa maestro
            const totalInscritos = await this.prisma.programaInscripcion.count({
              where: {
                programa: { programaId: master.programaId },
                estado: { in: ['activo', 'aprobado'] }
              }
            });
            studentCount = totalInscritos;
            programaDos = {
              id: null,
              nombre: master.programa?.nombre || master.nombre || 'Gestión Central',
              tipo: { nombre: 'MÓDULO GLOBAL' },
              sede: { nombre: 'Todas las Sedes' },
              codigo: 'GLOBAL',
              banner: master.programa?.banner
            };
          }
        }

        // Módulo operativo (programaModuloDos) o maestro
        let modulo: any = null;
        if (d.moduloId) {
          modulo = await this.prisma.programaModuloDos.findUnique({ where: { id: d.moduloId } }).catch(() => null);
        } else if (d.moduloMaestroId) {
          modulo = d._masterModulo ?? await this.prisma.programaModulo.findUnique({
            where: { id: d.moduloMaestroId }
          }).catch(() => null);
        }

        // Turno
        const turno = d.turnoId
          ? await this.prisma.programaDosTurno.findUnique({
              where: { id: d.turnoId },
              include: { turnoConfig: true }
            }).catch(() => null)
          : null;

        return { ...d, programaDos, modulo, turno, studentCount };
      } catch (err) {
        console.error('Error hydrating docencia:', err);
        return null;
      }
    }));

    // Filtrar válidos
    const validResults = results.filter((r): r is NonNullable<typeof r> =>
      r !== null && (!!r.programaDosId || r.isGlobalMaster)
    );

    // ── AGRUPAR POR PROGRAMA ──
    const groupedMap = new Map<string, any>();
    for (const r of validResults) {
      // Priorizar agrupar por programaDosId (oferta específica)
      // Si es un global puro sin oferta, agrupamos por su propio ID
      const progId = r.programaDosId ?? `global-master-${r.moduloMaestroId}`;

      if (!groupedMap.has(progId)) {
        groupedMap.set(progId, {
          id: r.programaDosId ?? r.moduloMaestroId,
          nombre: r.programaDos?.nombre ?? 'Inducción Global',
          tipo: r.programaDos?.tipo?.nombre ?? 'MÓDULO GLOBAL',
          sede: r.programaDos?.sede?.nombre ?? 'Todas las Sedes',
          codigo: r.programaDos?.codigo ?? 'GLOBAL',
          isGlobal: r.isGlobalMaster && !r.programaDosId,
          modulos: []
        });
      }

      groupedMap.get(progId).modulos.push({
        id: r.id, 
        moduloId: r.moduloId ?? r.moduloMaestroId,
        nombre: r.modulo?.nombre ?? 'Módulo Académico',
        codigo: r.modulo?.codigo ?? '-',
        fechaInicio: r.modulo?.fechaInicio ?? null,
        fechaFin: r.modulo?.fechaFin ?? null,
        turno: r.turno?.turnoConfig?.nombre ?? 'Global',
        turnoId: r.turnoId ?? null,
        isGlobal: r.isGlobalMaster ?? false,
        studentCount: r.studentCount
      });
    }

    // Ordenar: globales sin sede arriba, luego por nombre
    return Array.from(groupedMap.values()).sort((a, b) => {
      if (a.isGlobal && !b.isGlobal) return -1;
      if (!a.isGlobal && b.isGlobal) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }

  async getEstudiantesPorCurso(moduloId: string, turnoId: string) {
    // Estrategia 1: buscar como moduloId de programaModuloDos
    const modulo = await this.prisma.programaModuloDos.findUnique({
      where: { id: moduloId },
      include: { programaDos: true }
    }).catch(() => null);

    let programaDosId: string | null = modulo?.programaDos?.id ?? null;

    // Estrategia 2: Si no encontró módulo nuevo, intentar como módulo tradicional (Maestro)
    let isGlobalMaster = false;
    if (!programaDosId) {
      const moduloTra = await this.prisma.programaModulo.findUnique({
        where: { id: moduloId },
        include: { programa: { include: { programaDos: true } } }
      }).catch(() => null);

      if (moduloTra) {
        isGlobalMaster = moduloTra.esGlobal;
        // Si es global, queremos todos los programaDosIds vinculados
        const allProgDosIds = moduloTra.programa.programaDos.map(p => p.id);
        
        if (isGlobalMaster) {
          // Si es global, retornamos todos los estudiantes de todos los programaDos
          const inscripciones = await this.prisma.programaInscripcion.findMany({
            where: {
              programaId: { in: allProgDosIds },
              estado: { in: ['activo', 'aprobado'] }
            },
            include: {
              persona: {
                select: { id: true, nombre: true, apellidos: true, imagen: true, correo: true }
              }
            },
            orderBy: [{ persona: { apellidos: 'asc' } }, { persona: { nombre: 'asc' } }]
          });
          return inscripciones.map((i: any) => ({
            ...i,
            persona: {
              ...i.persona,
              nombreCompleto: `${i.persona?.nombre || ''} ${i.persona?.apellidos || ''}`.trim() || 'Estudiante'
            }
          }));
        } else if (allProgDosIds.length > 0) {
          programaDosId = allProgDosIds[0];
        }
      }
    }

    // Estrategia 3: Si no encontró módulo, intentar como programaDosId directamente
    if (!programaDosId) {
      const progDos = await this.prisma.programaDos.findUnique({
        where: { id: moduloId }
      }).catch(() => null);
      if (progDos) programaDosId = progDos.id;
    }

    if (!programaDosId) return [];

    const where: any = {
      programaId: programaDosId,
      estado: { in: ['activo', 'aprobado'] }
    };

    // Solo filtrar por turno si viene un valor válido
    if (turnoId && turnoId !== 'undefined' && turnoId !== 'null' && turnoId !== 'global') {
      where.turnoId = turnoId;
    }

    const inscripciones = await this.prisma.programaInscripcion.findMany({
      where,
      include: {
        persona: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            imagen: true,
            correo: true
          }
        }
      },
      orderBy: [
        { persona: { apellidos: 'asc' } },
        { persona: { nombre: 'asc' } }
      ]
    });

    return inscripciones.map((i: any) => ({
      ...i,
      persona: {
        ...i.persona,
        nombreCompleto: `${i.persona?.nombre || ''} ${i.persona?.apellidos || ''}`.trim() || 'Estudiante'
      }
    }));
  }

  /**
   * Obtiene los cursos donde el usuario está inscrito o es facilitador
   */
  async getMisCursos(userId: string) {
    try {
      const inscripciones = await this.prisma.programaInscripcion.findMany({
        where: {
          personaId: userId,
          estado: 'activo',
        },
        include: {
          programa: {
            include: {
              tipo: true,
              version: true,
              sede: true,
              modulos: {
                where: { estado: { not: 'eliminado' } },
                orderBy: { orden: 'asc' }
              },
              programa: {
                include: {
                  modulos: {
                    where: { estado: 'activo' },
                    orderBy: { orden: 'asc' },
                    include: { facilitador: { select: { nombre: true, apellidos: true } } }
                  }
                }
              }
            }
          },
          turno: {
            include: {
              turnoConfig: true
            }
          },
        },
      }) as any[];

      const docencias = await this.prisma.programaDosFacilitador.findMany({
        where: {
          facilitadorId: userId,
          estado: 'activo',
        },
        select: {
          id: true,
          programaDosId: true,
          moduloId: true,
          moduloMaestroId: true,
          turnoId: true,
          facilitadorId: true,
          estado: true,
        }
      }) as any[];

      // Hidratar docencias de forma segura
      const docenciasHydrated = await Promise.all(docencias.map(async (d: any) => {
        try {
          const programaDos = d.programaDosId ? await this.prisma.programaDos.findUnique({
            where: { id: d.programaDosId },
            include: { 
              tipo: true, version: true, sede: true,
              inscripciones: { where: { estado: 'activo' }, select: { id: true } }
            }
          }).catch(() => null) : null;

          const modulo = d.moduloId ? await this.prisma.programaModuloDos.findUnique({
            where: { id: d.moduloId },
            include: {
              mod_unidades: {
                include: { _count: { select: { actividades: true } } }
              }
            }
          }).catch(() => null) : (d.moduloMaestroId ? await this.prisma.programaModulo.findUnique({
            where: { id: d.moduloMaestroId },
            include: {
              mod_unidades: {
                include: { _count: { select: { actividades: true } } }
              }
            }
          }).catch(() => null) : null);

          const turno = d.turnoId ? await this.prisma.programaDosTurno.findUnique({
            where: { id: d.turnoId },
            include: { turnoConfig: true }
          }).catch(() => null) : null;

          return { ...d, programaDos, modulo, turno };
        } catch { return { ...d, programaDos: null, modulo: null, turno: null }; }
      }));

      // --- AGRUPACIÓN PARA ESTUDIANTE ---
      const estudianteProgramas: any[] = [];
      const globalProgsMap = new Map<string, any>();

      for (const i of inscripciones) {
        const progDos = i.programa;
        if (!progDos) continue;

        // EXTRAER MÓDULOS GLOBALES (Módulo Maestro) COMO PROGRAMAS INDEPENDIENTES
        if (progDos.programa?.modulos) {
          const globalMasters = progDos.programa.modulos
            .filter((m: any) => m.esGlobal && m.estado === 'activo')
            .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
          for (const gm of globalMasters) {
            if (!globalProgsMap.has(gm.id)) {
              // Progreso del módulo global
              const totalMod = await this.prisma.mod_actividad.count({
                where: { unidad: { moduloMaestroId: gm.id, estado: 'activo' }, estado: 'activo' }
              });
              const compMod = await this.prisma.mod_actividad.count({
                where: {
                  unidad: { moduloMaestroId: gm.id, estado: 'activo' },
                  estado: 'activo',
                  OR: [
                    { tarea: { entregas: { some: { userId } } } },
                    { foro: { posts: { some: { userId } } } },
                    { cuestionario: { intentos: { some: { userId, estado: 'finalizado' } } } }
                  ]
                }
              });

              // Buscar si hay un facilitador asignado específicamente a este módulo global para esta oferta
              const facGlobal = await this.prisma.programaDosFacilitador.findFirst({
                where: { moduloMaestroId: gm.id, programaDosId: progDos.id, estado: 'activo' },
                include: { facilitador: { select: { nombre: true, apellidos: true } } }
              });

              globalProgsMap.set(gm.id, {
                id: gm.id,
                nombre: gm.nombre,
                tipo: 'INDUCCIÓN / MÓDULO MAESTRO',
                version: 'Global',
                sede: 'Aula Virtual Profe',
                isGlobal: true,
                codigo: 'MASTER-M0',
                progreso: {
                  total: totalMod,
                  completadas: compMod,
                  porcentaje: totalMod > 0 ? Math.round((compMod / totalMod) * 100) : 0
                },
                banner: progDos.banner,
                pro_banner: progDos.banner,
                modulos: [{
                  id: gm.id,
                  nombre: gm.nombre,
                  codigo: gm.codigo || 'M0',
                  facilitador: facGlobal ? `${facGlobal.facilitador.nombre} ${facGlobal.facilitador.apellidos}` : 
                               gm.facilitador ? `${gm.facilitador.nombre} ${gm.facilitador.apellidos}` : 'Super Admin',
                  isGlobal: true,
                  progreso: {
                    total: totalMod,
                    completadas: compMod,
                    porcentaje: totalMod > 0 ? Math.round((compMod / totalMod) * 100) : 0
                  }
                }]
              });
            }
          }
        }

        const modulosList: any[] = [];

        // 1. Módulos LMS (Nueva Estructura)
        if (progDos.modulos && progDos.modulos.length > 0) {
          for (const m of progDos.modulos) {
            const facAsignado = await this.prisma.programaDosFacilitador.findFirst({
              where: { moduloId: m.id, estado: 'activo' },
              include: { facilitador: { select: { nombre: true, apellidos: true } } }
            });

            const totalMod = await this.prisma.mod_actividad.count({
              where: { unidad: { moduloId: m.id }, estado: 'activo' }
            });
            const compMod = await this.prisma.mod_actividad.count({
              where: {
                unidad: { moduloId: m.id },
                estado: 'activo',
                OR: [
                  { tarea: { entregas: { some: { userId } } } },
                  { foro: { posts: { some: { userId } } } },
                  { cuestionario: { intentos: { some: { userId, estado: 'finalizado' } } } }
                ]
              }
            });

            modulosList.push({
              id: m.id,
              nombre: m.nombre,
              codigo: m.codigo,
              fechaInicio: m.fechaInicio,
              fechaFin: m.fechaFin,
              facilitador: facAsignado ? `${facAsignado.facilitador.nombre} ${facAsignado.facilitador.apellidos}` : 'Por asignar',
              progreso: {
                total: totalMod,
                completadas: compMod,
                porcentaje: totalMod > 0 ? Math.round((compMod / totalMod) * 100) : 0
              }
            });
          }
        }

        // 2. Fallback Tradicional
        if (modulosList.length === 0 && progDos.programa?.modulos && progDos.programa.modulos.length > 0) {
          const regularMasters = progDos.programa.modulos
            .filter((m: any) => !m.esGlobal && m.estado === 'activo')
            .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
          for (const m of regularMasters) {
            const totalMod = await this.prisma.mod_actividad.count({
              where: { unidad: { moduloId: m.id }, estado: 'activo' }
            });
            const compMod = await this.prisma.mod_actividad.count({
              where: {
                unidad: { moduloId: m.id },
                estado: 'activo',
                OR: [
                  { tarea: { entregas: { some: { userId } } } },
                  { foro: { posts: { some: { userId } } } },
                  { cuestionario: { intentos: { some: { userId, estado: 'finalizado' } } } }
                ]
              }
            });

            modulosList.push({
              id: m.id,
              nombre: m.nombre,
              codigo: m.codigo,
              facilitador: 'Por asignar',
              progreso: {
                total: totalMod,
                completadas: compMod,
                porcentaje: totalMod > 0 ? Math.round((compMod / totalMod) * 100) : 0
              }
            });
          }
        }

        const totalProg = modulosList.reduce((acc, m) => acc + (m.progreso?.total || 0), 0);
        const compProg = modulosList.reduce((acc, m) => acc + (m.progreso?.completadas || 0), 0);

        estudianteProgramas.push({
          id: progDos.id,
          nombre: progDos.nombre,
          tipo: progDos.tipo?.nombre || 'Programa',
          version: progDos.version?.nombre || '1',
          sede: progDos.sede?.nombre,
          programaInscripcionId: i.id,
          estado: i.estado,
          costo: progDos.costo,
          turno: i.turno?.turnoConfig?.nombre || 'Mañana',
          codigo: progDos.codigo,
          modulos: modulosList,
          notaMaxima: progDos.tipo?.notaMaxima || 100,
          notaReprobacion: progDos.tipo?.notaReprobacion || 60,
          progreso: {
            total: totalProg,
            completadas: compProg,
            porcentaje: totalProg > 0 ? Math.round((compProg / totalProg) * 100) : 0
          },
          banner: progDos.banner,
          pro_banner: progDos.banner
        });
      }

      // --- AGRUPACIÓN PARA FACILITADOR ---
      // Los módulos globales ya aparecen en la sección de estudiante (globalProgsMap),
      // por eso aquí solo agrupamos las asignaciones operativas (programaDosId).
      const facilitadorMap = new Map<string, any>();

      for (const d of docenciasHydrated) {
        if (!d.programaDos || !d.programaDos.id) continue;

        const progId = d.programaDos.id;
        if (!facilitadorMap.has(progId)) {
          facilitadorMap.set(progId, {
            id: progId,
            nombre: d.programaDos.nombre,
            tipo: d.programaDos.tipo?.nombre || 'Programa',
            sede: d.programaDos.sede?.nombre,
            codigo: d.programaDos.codigo,
            banner: d.programaDos.banner,
            pro_banner: d.programaDos.banner,
            modulos: []
          });
        }

        if (d.moduloId) {
          const progEntry = facilitadorMap.get(progId);
          progEntry.modulos.push({
            id: d.id,
            moduloId: d.moduloId,
            nombre: d.modulo?.nombre || 'Módulo sin nombre',
            codigo: d.modulo?.codigo || d.programaDos.codigo,
            fechaInicio: d.modulo?.fechaInicio,
            fechaFin: d.modulo?.fechaFin,
            turno: d.turno?.turnoConfig?.nombre || 'Mañana',
            turnoId: d.turnoId,
            studentCount: d.programaDos.inscripciones?.length ?? 0
          });
        }
      }

      return {
        estudiante: [
          ...Array.from(globalProgsMap.values()),
          ...estudianteProgramas
        ],
        facilitador: Array.from(facilitadorMap.values()),
      };
    } catch (error) {
      console.error('Error en getMisCursos:', error);
      throw error;
    }
  }

  async getCourseContent(id: string, userId: string, passedTurnoId?: string) {
    // 0. Verificar si el usuario es facilitador antes de cargar para decidir qué filtrar
    // 0. Verificar si es Facilitador del módulo o programa
    const isFacilitadorUser = await this.prisma.programaDosFacilitador.findFirst({
      where: { 
        facilitadorId: userId, 
        OR: [
          { moduloId: id }, 
          { programaDosId: id }, 
          { moduloMaestroId: id }
        ] 
      }
    }).then(async f => {
        if (f) return true;
        // Si no está en la tabla de asignaciones específicas, revisar si es el facilitador directo del modulo maestro
        try {
          const directMasterFac = await this.prisma.programaModulo.findFirst({
              where: { id, facilitadorId: userId }
          });
          return !!directMasterFac;
        } catch {
          return false;
        }
    });

    // 1. Intentar encontrar como Módulo LMS (Nueva Estructura)
    let modulo = await this.prisma.programaModuloDos.findUnique({
      where: { id },
      include: {
        programaDos: { include: { tipo: true, sede: true } },
        mod_unidades: {
          where: {
            ...(isFacilitadorUser ? {} : { estado: 'activo' }),
            ...(passedTurnoId ? { turnoId: passedTurnoId } : {}), // <--- FILTRO POR TURNO
          },
          orderBy: [
            { semana: 'asc' },
            { orden: 'asc' }
          ],
          include: {
            actividades: {
              where: isFacilitadorUser ? { estado: { not: 'eliminado' } } : { estado: 'activo' },
              orderBy: { orden: 'asc' },
              include: {
                foro: {
                  include: {
                    _count: { select: { posts: true } },
                    posts: { where: { userId: userId }, take: 1 }
                  }
                },
                tarea: {
                  include: {
                    _count: { select: { entregas: true } },
                    entregas: { where: { userId: userId }, take: 1 }
                  }
                },
                cuestionario: {
                  include: {
                    _count: { select: { intentos: true } },
                    intentos: { where: { userId: userId }, take: 1 }
                  }
                },
                categoria: { include: { config: true } },
                notas: { where: { userId: userId }, take: 1 }
              }
            },
            recursos: {
              where: isFacilitadorUser ? { estado: { not: 'eliminado' } } : { estado: 'activo' },
              orderBy: { orden: 'asc' }
            }
          }
        }
      }
    });

    // 1b. Si no encontró como ModuloDos, buscar como ModuloMaestro (Global)
    if (!modulo) {
      const master = await this.prisma.programaModulo.findUnique({
        where: { id },
        include: {
          mod_unidades: {
            where: isFacilitadorUser ? {} : { estado: 'activo' },
            orderBy: [{ semana: 'asc' }, { orden: 'asc' }],
            include: {
              actividades: {
                where: isFacilitadorUser ? { estado: { not: 'eliminado' } } : { estado: 'activo' },
                orderBy: { orden: 'asc' },
                include: {
                  foro: {
                    include: {
                      _count: { select: { posts: true } },
                      posts: { where: { userId: userId }, take: 1 }
                    }
                  },
                  tarea: {
                    include: {
                      _count: { select: { entregas: true } },
                      entregas: { where: { userId: userId }, take: 1 }
                    }
                  },
                  cuestionario: {
                    include: {
                      _count: { select: { intentos: true } },
                      intentos: { where: { userId: userId }, take: 1 }
                    }
                  },
                  categoria: { include: { config: true } },
                  notas: { where: { userId: userId }, take: 1 }
                }
              },
              recursos: {
                where: isFacilitadorUser ? { estado: { not: 'eliminado' } } : { estado: 'activo' },
                orderBy: { orden: 'asc' }
              }
            }
          }
        }
      });

      if (master) {
        // Para módulos globales, el contexto debe ser el Programa Maestro, no una sede específica
        const pMaestro = await this.prisma.programa.findUnique({
          where: { id: master.programaId }
        });

        const virtualContext = {
          id: null,
          nombre: pMaestro?.nombre || master.nombre,
          codigo: pMaestro?.codigo || 'GLOBAL',
          banner: pMaestro?.banner,
          sede: { nombre: 'Todas las Sedes' },
          tipo: { nombre: 'Inducción / Módulo Maestro' }
        };

        modulo = {
          ...master,
          programaDos: virtualContext,
          programaDosId: null, // Evitar anclaje a una sede
          masterProgramaId: master.programaId, // Guardamos para la query de participantes
          isGlobal: true
        } as any;
      }
    }

    if (modulo) {
      let studentCount = 0;
      if (isFacilitadorUser) {
        if ((modulo as any).isGlobal) {
          studentCount = await this.prisma.programaInscripcion.count({
            where: { programa: { programaId: (modulo as any).masterProgramaId }, estado: { in: ['activo', 'aprobado'] } }
          });
        } else if ((modulo as any).programaDosId) {
          studentCount = await this.prisma.programaInscripcion.count({
            where: { programaId: (modulo as any).programaDosId, ...(passedTurnoId ? { turnoId: passedTurnoId } : {}), estado: { in: ['activo', 'aprobado'] } }
          });
        }
      }

      (modulo as any).studentCount = studentCount;

      // Hidratar actividades con información de entrega para el usuario actual
      (modulo as any).mod_unidades = modulo.mod_unidades.map(u => ({
        ...u,
        actividades: u.actividades.map((act: any) => {
          const userSubmitted =
            (act.tarea?.entregas?.length > 0) ||
            (act.foro?.posts?.length > 0) ||
            (act.cuestionario?.intentos?.some((i: any) => i.estado === 'finalizado'));

          const gradeInfo = act.notas?.[0];

          return {
            ...act,
            userSubmitted,
            userGrade: gradeInfo?.nota ?? null,
            userComment: gradeInfo?.observacion ?? null,
            isGraded: !!gradeInfo,
            respuestasCount: act.tarea?._count?.entregas || act.foro?._count?.posts || act.cuestionario?._count?.intentos || 0
          };
        })
      }));
    }

    // 2. Si no encontró módulo, buscar en ProgramaDos directamente
    if (!modulo) {
      // 2a. Intentar como ProgramaDos (puede tener módulos o no)
      const p2 = await this.prisma.programaDos.findUnique({
        where: { id },
        include: {
          modulos: { where: { estado: { not: 'eliminado' } }, orderBy: { orden: 'asc' }, take: 1 },
          tipo: true,
          sede: true,
        }
      });

      if (p2) {
        // Si tiene módulos, redirigir al primer módulo
        if (p2.modulos.length > 0) {
          return this.getCourseContent(p2.modulos[0].id, userId);
        }

        // Si NO tiene módulos, retornar el programa como un curso virtual vacío
        // para que el usuario vea la página sin errores
        return {
          id: p2.id,
          nombre: p2.nombre,
          programaDos: p2,
          programaDosId: p2.id,
          mod_unidades: [],
          participantes: [],
          currentTurnoId: undefined,
          _isVirtualCourse: true,
        };
      }

      // 2b. Módulo tradicional -> buscar espejo en LMS
      const moduloTra = await this.prisma.programaModulo.findUnique({
        where: { id },
        include: { programa: { include: { programaDos: { take: 1 } } } }
      });

      if (moduloTra) {
        const pDos = moduloTra.programa.programaDos[0];

        // Intentar buscar espejo
        if (pDos) {
          let espejo = await this.prisma.programaModuloDos.findFirst({
            where: {
              programaDosId: pDos.id,
              nombre: moduloTra.nombre,
              estado: { not: 'eliminado' }
            }
          });

          // Fallback final: Si el nombre no coincide pero el programa tiene módulos activos, 
          // probablemente el facilitador creó el contenido ahí pero con otro nombre.
          if (!espejo) {
            espejo = await this.prisma.programaModuloDos.findFirst({
              where: { programaDosId: pDos.id, estado: { not: 'eliminado' } },
              orderBy: { orden: 'asc' }
            });
          }

          if (espejo) return this.getCourseContent(espejo.id, userId);
        }

        // Si no hay espejo o no hay programaDos, retornar shell virtual basado en el módulo tradicional
        return {
          id: moduloTra.id,
          nombre: moduloTra.nombre,
          programaDos: pDos || null,
          programaDosId: pDos?.id || null,
          mod_unidades: [],
          participantes: [],
          currentTurnoId: undefined,
          _isVirtualCourse: true,
          _isTraditionalModule: true
        };
      }

      // 2c. Intentar como Programa Tradicional (programa -> programaDos -> módulo)
      const p1 = await this.prisma.programa.findUnique({
        where: { id },
        include: { programaDos: { include: { modulos: { where: { estado: 'activo' }, take: 1 } } } }
      });
      if (p1 && p1.programaDos.length > 0 && p1.programaDos[0].modulos.length > 0) {
        return this.getCourseContent(p1.programaDos[0].modulos[0].id, userId, passedTurnoId);
      }

      // Si llegamos aquí, el ID no existe en ninguna tabla
      throw new NotFoundException(`No se encontró ningún curso o módulo con el ID: ${id}`);
    }

    // 4. Resolver TurnoId y Participantes
    let turnoId: string | undefined = passedTurnoId;
    
    if (!turnoId) {
      const facilitator = await this.prisma.programaDosFacilitador.findFirst({
        where: { 
          facilitadorId: userId, 
          OR: [
            { moduloId: modulo.id },
            { moduloMaestroId: modulo.id }
          ]
        }
      });

      if (facilitator) {
        turnoId = facilitator.turnoId;
      } else {
        // Si es alumno, buscamos su turno de inscripción
        const studentEnr = await this.prisma.programaInscripcion.findFirst({
          where: {
            personaId: userId,
            ...( (modulo as any).isGlobal 
                 ? { programa: { programaId: (modulo as any).masterProgramaId } }
                 : { programaId: modulo.programaDosId || undefined }
            )
          }
        });
        if (studentEnr) turnoId = studentEnr.turnoId || undefined;
      }
    }

    // Traer participantes ACTIVOS filtrados por el turno elegido
    const participantes = await this.prisma.programaInscripcion.findMany({
      where: {
        ...( (modulo as any).isGlobal 
            ? { programa: { programaId: (modulo as any).masterProgramaId } } 
            : { programaId: modulo.programaDosId } 
        ),
        ...(turnoId ? { turnoId } : {}), // <--- FILTRO DE TURNO
        estado: { in: ['activo', 'aprobado'] }
      },
      include: {
        persona: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            imagen: true,
            correo: true
          }
        }
      }
    });

    return {
      ...modulo,
      participantes: participantes.map(p => ({
        ...p,
        persona: {
          ...p.persona,
          nombreCompleto: `${p.persona?.nombre || ''} ${p.persona?.apellidos || ''}`.trim() || 'Estudiante'
        }
      })),
      currentTurnoId: turnoId
    };
  }

  async getActividadDetalle(actividadId: string) {
    const actividad = await this.prisma.mod_actividad.findUnique({
      where: { id: actividadId },
      include: {
        foro: true,
        tarea: true,
        cuestionario: true,
        categoria: true
      }
    });
    if (!actividad) throw new NotFoundException('Actividad no encontrada');
    return actividad;
  }

  async getForoPosts(foroId: string) {
    return this.prisma.mod_foro_post.findMany({
      where: { foroId, padreId: null },
      include: {
        user: { select: { id: true, nombre: true, apellidos: true, imagen: true } },
        respuestas: {
          include: {
            user: { select: { id: true, nombre: true, apellidos: true, imagen: true } },
            respuestas: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async crearPost(foroId: string, userId: string, data: { mensaje: string, padreId?: string }) {
    try {
      return await this.prisma.mod_foro_post.create({
        data: {
          foroId,
          userId,
          mensaje: data.mensaje,
          padreId: data.padreId || null
        }
      });
    } catch (err) {
      console.error(`[ERROR] LmsService.crearPost → FAILED:`, err);
      throw err;
    }
  }

  async submitTarea(tareaId: string, userId: string, data: { texto?: string, archivoUrl?: string } = {}) {
    // Upsert entrega
    const entrega = await this.prisma.mod_entrega.findFirst({
      where: { tareaId, userId }
    });

    if (entrega) {
      return this.prisma.mod_entrega.update({
        where: { id: entrega.id },
        data: {
          texto: data.texto,
          archivoUrl: data.archivoUrl,
          updatedAt: new Date()
        }
      });
    }

    return this.prisma.mod_entrega.create({
      data: {
        tareaId,
        userId,
        texto: data.texto,
        archivoUrl: data.archivoUrl
      }
    });
  }

  // --- FACILITADOR ACTIONS ---

  private async validarPuntajeCategoria(categoriaId: string, nuevoPuntaje: number, actividadId?: string) {
    if (!categoriaId) return;

    const categoria = await this.prisma.mod_categoria_calificacion.findFirst({
        where: { 
            id: categoriaId,
            estado: 'activo'
        },
        include: {
            config: true,
            actividades: {
                where: {
                    esCalificable: true,
                    estado: 'activo',
                    ...(actividadId ? { NOT: { id: actividadId } } : {})
                }
            }
        }
    });

    if (!categoria || !categoria.config) return;

    const sumaActual = categoria.actividades.reduce((acc, act) => acc + act.puntajeMax, 0);
    const limite = categoria.config.peso;

    if (sumaActual + nuevoPuntaje > limite) {
      throw new BadRequestException(
        `El puntaje total en la categoría "${categoria.config.nombre}" excede el límite de ${limite}. Actualmente tienes ${sumaActual} puntos asignados. Puedes asignar máximo ${limite - sumaActual} puntos más.`
      );
    }
  }

  async crearActividad(userId: string, data: any) {
    // 1. Verificar que el usuario es facilitador del modulo
    const unit = await this.prisma.mod_unidad_tematica.findUnique({
      where: { id: data.unidadId }
    });
    if (!unit) throw new NotFoundException('Unidad temática no encontrada');

    // Verificar permisos:
    // Si la unidad es de un módulo local (moduloId), verificamos ProgramaDosFacilitador
    // Si la unidad es de un módulo maestro (moduloMaestroId), permitimos si es SuperAdmin o facilitador de ese curso
    let canEdit = false;

    let isFacilitador: any = null;

    if (unit.moduloId) {
      isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: {
          facilitadorId: userId,
          moduloId: unit.moduloId,
          estado: 'activo'
        },
        include: { modulo: true }
      });
      if (isFacilitador) canEdit = true;
    } else if (unit.moduloMaestroId) {
      // 1. Verificar si tiene asignación directa a este modulo maestro
      isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: {
          facilitadorId: userId,
          moduloMaestroId: unit.moduloMaestroId,
          estado: 'activo'
        }
      });
      
      if (isFacilitador) {
        canEdit = true;
      } else {
        // 2. Fallback: verificar si es facilitador en CUALQUIER módulo de este programa (acceso heredado para globales)
        const masterMod = await this.prisma.programaModulo.findUnique({ where: { id: unit.moduloMaestroId } });
        isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
          where: {
            facilitadorId: userId,
            programaDos: { programaId: masterMod?.programaId },
            estado: 'activo'
          }
        });
        if (isFacilitador) {
          canEdit = true;
        } else {
          // 3. Fallback: facilitador directo en programaModulo
          if (masterMod?.facilitadorId === userId) canEdit = true;
        }
      }
    }

    // Fallback: Si es Super Admin (opcional, dependiendo de si manejas roles aquí)
    if (!canEdit) {
      const isAdmin = await this.prisma.userRole.findFirst({
        where: {
          userId,
          role: { name: { in: ['ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'] } }
        }
      });
      if (isAdmin) canEdit = true;
    }

    if (!canEdit) throw new ForbiddenException('No tienes permisos en este módulo');

    // 1.5 Validar sumatoria de puntajes si es calificable
    if (data.esCalificable !== false && data.categoriaId) {
      await this.validarPuntajeCategoria(data.categoriaId, data.puntajeMax || 0);
    }

    // 2. Crear actividad y subtipo en transacción atómica
    return this.prisma.$transaction(async (tx) => {
      const actividad = await tx.mod_actividad.create({
        data: {
          unidadId: data.unidadId,
          tipo: data.tipo,
          titulo: data.titulo,
          instrucciones: data.instrucciones,
          puntajeMax: data.puntajeMax || 100,
          esCalificable: data.esCalificable ?? true,
          fechaInicio: new Date(data.fechaInicio),
          fechaFin: new Date(data.fechaFin),
          categoriaId: data.categoriaId || null,
          estado: 'activo'
        }
      });

      // 3. Crear subtipo si aplica
      if (data.tipo === 'FORO') {
        await tx.mod_foro.create({
          data: {
            actividadId: actividad.id,
            permitirFiles: data.permitirFiles ?? true
          }
        });
      } else if (data.tipo === 'TAREA') {
        await tx.mod_tarea.create({
          data: {
            actividadId: actividad.id,
            allowFiles: data.allowFiles ?? true,
            allowText: data.allowText ?? true,
            maxArchivos: data.maxArchivos || 1,
            tiposArch: data.tiposArch || 'pdf,doc,docx,jpg,png,zip,rar'
          }
        });
      } else if (data.tipo === 'CUESTIONARIO' || data.tipo === 'FORMULARIO') {
        await tx.mod_cuestionario.create({
          data: {
            actividadId: actividad.id,
            duracion: data.duracion || 60,
            maxIntentos: data.maxIntentos || 1
          }
        });
      }

      // 4. Notificar a los estudiantes
      let modId = unit.moduloId || unit.moduloMaestroId;
      let modName = 'Módulo';
      let whereInscritos: any = { estado: 'activo' };

      if (unit.moduloId) {
        const mod = await tx.programaModuloDos.findUnique({ where: { id: unit.moduloId } });
        modName = mod?.nombre || 'Módulo';
        whereInscritos.programaId = mod?.programaDosId;
      } else if (unit.moduloMaestroId) {
        const mod = await tx.programaModulo.findUnique({ 
          where: { id: unit.moduloMaestroId },
          include: { programa: true }
        });
        modName = mod?.nombre || 'Módulo';
        whereInscritos.programa = { programaId: mod?.programaId };
      }

      if (unit.turnoId) {
        whereInscritos.turnoId = unit.turnoId;
      }

      const inscritos = await tx.programaInscripcion.findMany({
        where: whereInscritos
      });

      for (const insc of inscritos) {
        try {
          await this.notiService.emit({
            userId: insc.personaId,
            titulo: `Nueva Actividad: ${actividad.titulo}`,
            mensaje: `Se ha publicado una nueva actividad en el módulo ${modName}.`,
            tipo: 'NUEVA_ACTIVIDAD',
            linkRef: `/aula/curso/${modId}/actividad/${actividad.id}`
          });
        } catch (e) {
          console.error(`[ERROR] Notification failed for user ${insc.personaId}:`, e);
        }
      }

      return actividad;
    });
  }

  async updateActividad(userId: string, actId: string, data: any) {
    const act = await this.prisma.mod_actividad.findUnique({
      where: { id: actId },
      include: { unidad: true }
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');

    // Permisos
    let isFacilitador: any = null;
    if (act.unidad.moduloId) {
      isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: {
          facilitadorId: userId,
          moduloId: act.unidad.moduloId,
          estado: 'activo'
        }
      });
    } else if (act.unidad.moduloMaestroId) {
      const masterMod = await this.prisma.programaModulo.findUnique({ where: { id: act.unidad.moduloMaestroId } });
      isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: {
          facilitadorId: userId,
          programaDos: { programaId: masterMod?.programaId },
          estado: 'activo'
        }
      });
    }

    if (!isFacilitador) {
      const isAdmin = await this.prisma.userRole.findFirst({
        where: {
          userId,
          role: { name: { in: ['ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'] } }
        }
      });
      if (!isAdmin) {
        throw new ForbiddenException('No autorizado para editar actividades en este módulo');
      }
    }

    // 0.5 Validar sumatoria de puntajes si es calificable
    const esCalificable = data.esCalificable ?? act.esCalificable;
    const categoriaId = data.categoriaId || act.categoriaId;
    const puntajeMax = data.puntajeMax ?? act.puntajeMax;

    if (esCalificable && categoriaId && act.estado === 'activo') {
      await this.validarPuntajeCategoria(categoriaId, puntajeMax, actId);
    }

    // 1. Actualizar Datos Base
    const updatedBase = await this.prisma.mod_actividad.update({
      where: { id: actId },
      data: {
        titulo: data.titulo,
        instrucciones: data.instrucciones,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
        puntajeMax: data.puntajeMax,
        esCalificable: data.esCalificable,
        categoriaId: data.categoriaId || null,
        estado: data.estado || 'activo'
      }
    });

    // 2. Actualizar Datos Específicos por Tipo
    if (act.tipo === 'TAREA') {
      await this.prisma.mod_tarea.updateMany({
        where: { actividadId: actId },
        data: {
          allowFiles: data.allowFiles ?? true,
          allowText: data.allowText ?? true,
          maxArchivos: data.maxArchivos,
          tiposArch: data.tiposArch
        }
      });
    } else if (act.tipo === 'FORO') {
      await this.prisma.mod_foro.updateMany({
        where: { actividadId: actId },
        data: {
          permitirFiles: data.permitirFiles ?? true
        }
      });
    } else if (act.tipo === 'CUESTIONARIO' || act.tipo === 'FORMULARIO') {
      await this.prisma.mod_cuestionario.updateMany({
        where: { actividadId: actId },
        data: {
          duracion: data.duracion || 60,
          maxIntentos: data.maxIntentos || 1
        }
      });
    }

    return updatedBase;
  }

  async deleteActividad(userId: string, actId: string) {
    const act = await this.prisma.mod_actividad.findUnique({
      where: { id: actId },
      include: {
        unidad: true,
        tarea: { select: { id: true } },
        foro: { select: { id: true } },
        cuestionario: { select: { id: true } }
      }
    });

    if (!act) throw new NotFoundException('Actividad no encontrada');

    // 1. Verificar Permisos
    let isFacilitador: any = null;
    if (act.unidad.moduloId) {
      isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: {
          facilitadorId: userId,
          moduloId: act.unidad.moduloId,
          estado: 'activo'
        }
      });
    } else if (act.unidad.moduloMaestroId) {
      const masterMod = await this.prisma.programaModulo.findUnique({ where: { id: act.unidad.moduloMaestroId } });
      isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: {
          facilitadorId: userId,
          programaDos: { programaId: masterMod?.programaId },
          estado: 'activo'
        }
      });
    }

    if (!isFacilitador) {
      const isAdmin = await this.prisma.userRole.findFirst({
        where: {
          userId,
          role: { name: { in: ['ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'] } }
        }
      });
      if (!isAdmin) {
        throw new ForbiddenException('No tiene permisos para eliminar actividades en este módulo');
      }
    }

    // 2. Verificar si hay respuestas (La regla de negocio solicitada)
    let hasResponses = false;

    if (act.tipo === 'TAREA' && act.tarea) {
      const count = await this.prisma.mod_entrega.count({ where: { tareaId: act.tarea.id } });
      if (count > 0) hasResponses = true;
    } else if (act.tipo === 'FORO' && act.foro) {
      const count = await this.prisma.mod_foro_post.count({ where: { foroId: act.foro.id } });
      if (count > 0) hasResponses = true;
    } else if ((act.tipo === 'CUESTIONARIO' || act.tipo === 'FORMULARIO') && act.cuestionario) {
      const count = await this.prisma.mod_intento.count({ where: { cuestionarioId: act.cuestionario.id } });
      if (count > 0) hasResponses = true;
    }

    if (hasResponses) {
      throw new BadRequestException('No se puede eliminar la actividad porque ya cuenta con respuestas o registros de estudiantes.');
    }

    // 3. Proceder con el borrado suave (soft delete)
    return this.prisma.mod_actividad.update({
      where: { id: actId },
      data: { estado: 'eliminado' }
    });
  }

    async getCategoriasCalificacion(moduloId: string) {
        const data = await this.prisma.mod_categoria_calificacion.findMany({
            where: {
                OR: [
                    { moduloId: moduloId },
                    { moduloMaestroId: moduloId }
                ],
                estado: 'activo'
            },
            include: {
                config: true,
                actividades: {
                    where: { esCalificable: true, estado: 'activo' }
                }
            }
        });

    return data.map(c => ({
      id: c.id,
      nombre: c.config.nombre,
      ponderacion: c.config.peso,
      puntosAsignados: c.actividades.reduce((acc, a) => acc + a.puntajeMax, 0),
      esEvalFinal: c.config.esEvalFinal,
      configId: c.configId
    }));
  }

  async crearCategoriaCalificacion(facilitadorId: string, moduloId: string, data: any) {
    // 1. Verificar permisos
    let isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
      where: { facilitadorId, moduloId, estado: 'activo' },
      include: { programaDos: true }
    });

    let tipoId: string | undefined = isFacilitador?.programaDos?.tipoId;
    let isMaster = false;

    // FALLBACK: Si no es facilitador directo del modulo operativo, verificar si es master o del programa
    if (!isFacilitador) {
        const master = await this.prisma.programaModulo.findUnique({
            where: { id: moduloId },
            include: { programa: true }
        });
        if (master) {
            isMaster = true;
            tipoId = master.programa.tipoId;
            // Verificar si es facilitador de CUALQUIER oferta de este programa
            isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
                where: {
                    facilitadorId,
                    estado: 'activo',
                    programaDos: { programaId: master.programaId }
                }
            }) as any;
        }
    }

    if (!isFacilitador) throw new ForbiddenException('No autorizado');
    if (!tipoId) throw new BadRequestException('No se pudo determinar el tipo de programa');

    // 2. Crear un config dinámico
    const config = await this.prisma.mod_tipo_calificacion_config.create({
      data: {
        tipoProgramaId: tipoId,
        nombre: data.nombre,
        peso: data.ponderacion,
        estado: 'activo'
      }
    });

    // 3. Vincular al módulo
    return this.prisma.mod_categoria_calificacion.create({
      data: {
        ...(isMaster ? { moduloMaestroId: moduloId } : { moduloId }),
        configId: config.id,
        estado: 'activo'
      },
      include: { config: true }
    });
  }

  async verificarPago(inscripcionId: string) {
    const inscripcion = await this.prisma.programaInscripcion.findUnique({
      where: { id: inscripcionId },
      include: { programa: true }
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    const baucher = await this.prisma.programaBaucher.findFirst({
      where: { inscripcionId },
    });

    return {
      inscripcionId,
      pagoCompleto: baucher ? baucher.monto >= inscripcion.programa.costo : false,
      montoPagado: baucher?.monto || 0,
      costoRequerido: inscripcion.programa.costo,
      confirmado: baucher?.confirmado || false
    };
  }
  async getModuloUnidades(userId: string, moduloId: string, turnoId?: string) {
    // Verificar permisos: módulo LMS normal, o módulo maestro global (moduloMaestroId)
    const isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
      where: {
        facilitadorId: userId,
        OR: [
          { moduloId: moduloId },
          { moduloMaestroId: moduloId }
        ]
      }
    });

    // Fallback: facilitador directo en programaModulo (campo facilitadorId)
    if (!isFacilitador) {
      const directMaster = await this.prisma.programaModulo.findFirst({
        where: { id: moduloId, facilitadorId: userId }
      }).catch(() => null);
      if (!directMaster) throw new ForbiddenException('No autorizado para este módulo');
    }

    // Para módulo maestro, las unidades se buscan por moduloMaestroId
    const isMaster = await this.prisma.programaModulo.findUnique({ where: { id: moduloId } }).catch(() => null);
    if (isMaster) {
      return this.prisma.mod_unidad_tematica.findMany({
        where: { 
          moduloMaestroId: moduloId, 
          estado: 'activo',
          ...(turnoId ? { turnoId } : {})
        },
        orderBy: { semana: 'asc' }
      });
    }

    return this.prisma.mod_unidad_tematica.findMany({
      where: { 
        moduloId, 
        estado: 'activo',
        ...(turnoId ? { turnoId } : {})
      },
      orderBy: { semana: 'asc' }
    });
  }

  async crearModuloUnidad(userId: string, moduloId: string, data: any) {
    let realModuloId = moduloId;
    let isMasterGlobal = false;

    // 1. ¿Es un módulo maestro global (programaModulo)?
    const masterModulo = await this.prisma.programaModulo.findUnique({ where: { id: moduloId } }).catch(() => null);
    if (masterModulo) {
      // Verificar que el usuario es facilitador de este módulo maestro
      const isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: { facilitadorId: userId, moduloMaestroId: moduloId }
      });
      const isDirectFac = masterModulo.facilitadorId === userId;
      
      // Fallback: facilitador en cualquier oferta de este programa
      let isProgramFac = false;
      if (!isFacilitador && !isDirectFac) {
        const fac = await this.prisma.programaDosFacilitador.findFirst({
            where: {
                facilitadorId: userId,
                estado: 'activo',
                programaDos: { programaId: masterModulo.programaId }
            }
        });
        if (fac) isProgramFac = true;
      }

      if (!isFacilitador && !isDirectFac && !isProgramFac) throw new ForbiddenException('No autorizado para este módulo global');
      isMasterGlobal = true;
    } else {
      // 2. ¿Es un módulo LMS real (programaModuloDos)?
      const moduloReal = await this.prisma.programaModuloDos.findUnique({ where: { id: moduloId } });

      if (!moduloReal) {
        // 3. Puede ser un ProgramaDos ID (curso virtual sin módulos creados aún)
        const p2 = await this.prisma.programaDos.findUnique({ where: { id: moduloId } });
        if (p2) {
          const isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
            where: { facilitadorId: userId, programaDosId: moduloId }
          });
          if (!isFacilitador) throw new UnauthorizedException('No autorizado para este programa');

          // Crear el primer módulo automáticamente
          const nuevoModulo = await this.prisma.programaModuloDos.create({
            data: {
              programaDosId: p2.id,
              nombre: `Módulo Principal de ${p2.nombre}`,
              descripcion: p2.contenido || 'Sin descripción',
              codigo: p2.codigo || 'MOD-01',
              orden: 1,
              estado: 'activo',
              fechaInicio: p2.fechaInicioClases,
              fechaFin: p2.fechaFinInscripcion,
            }
          });

          await this.prisma.programaDosFacilitador.updateMany({
            where: { facilitadorId: userId, programaDosId: moduloId },
            data: { moduloId: nuevoModulo.id }
          });

          realModuloId = nuevoModulo.id;
        } else {
          throw new UnauthorizedException('No autorizado para este módulo');
        }
      } else {
        // Módulo LMS real: verificar autorización
        let isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
          where: {
            facilitadorId: userId,
            estado: 'activo',
            OR: [
              { moduloId: realModuloId },
              { moduloMaestroId: realModuloId }
            ]
          }
        });

        // FALLBACK para Master Modules
        if (!isFacilitador && isMasterGlobal) {
          const masterMod = await this.prisma.programaModulo.findUnique({ where: { id: realModuloId } });
          isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
            where: {
              facilitadorId: userId,
              estado: 'activo',
              programaDos: { programaId: masterMod?.programaId }
            }
          });
        }

        if (!isFacilitador) throw new ForbiddenException('No autorizado para este módulo');
      }
    }

    // Para módulos maestros globales, usar moduloMaestroId en lugar de moduloId
    return this.prisma.mod_unidad_tematica.create({
      data: {
        ...(isMasterGlobal ? { moduloMaestroId: realModuloId } : { moduloId: realModuloId }),
        titulo: data.titulo || 'Nueva Unidad',
        descripcion: data.descripcion,
        semana: Number(data.semana) || 1,
        orden: Number(data.orden) || 0,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : new Date(),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estado: 'activo',
        turnoId: data.turnoId || undefined
      }
    });
  }

  async updateModuloUnidad(userId: string, moduloId: string, unidadId: string, data: any) {
    let isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
      where: {
        facilitadorId: userId,
        estado: 'activo',
        OR: [
          { moduloId: moduloId },
          { moduloMaestroId: moduloId }
        ]
      }
    });

    if (!isFacilitador) {
      // Fallback 1: facilitador directo en programaModulo
      const masterMod = await this.prisma.programaModulo.findUnique({ 
        where: { id: moduloId } 
      }).catch(() => null);
      
      const isDirectFac = masterMod?.facilitadorId === userId;
      
      // Fallback 2: facilitador en cualquier oferta de este programa
      let isProgramFac = false;
      if (!isDirectFac && masterMod) {
        const fac = await this.prisma.programaDosFacilitador.findFirst({
          where: {
            facilitadorId: userId,
            estado: 'activo',
            programaDos: { programaId: masterMod.programaId }
          }
        });
        if (fac) isProgramFac = true;
      }

      if (!isDirectFac && !isProgramFac) throw new UnauthorizedException('No autorizado para este módulo');
    }

    return this.prisma.mod_unidad_tematica.update({
      where: { id: unidadId },
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        semana: data.semana !== undefined ? Number(data.semana) : undefined,
        orden: data.orden !== undefined ? Number(data.orden) : undefined,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
        estado: data.estado
      }
    });
  }

  async eliminarModuloUnidad(userId: string, moduloId: string, unidadId: string) {
    let isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
      where: {
        facilitadorId: userId,
        estado: 'activo',
        OR: [
          { moduloId: moduloId },
          { moduloMaestroId: moduloId }
        ]
      }
    });
    if (!isFacilitador) {
      // Fallback 1: facilitador directo en programaModulo
      const masterMod = await this.prisma.programaModulo.findUnique({ 
        where: { id: moduloId } 
      }).catch(() => null);
      
      const isDirectFac = masterMod?.facilitadorId === userId;
      
      // Fallback 2: facilitador en cualquier oferta de este programa
      let isProgramFac = false;
      if (!isDirectFac && masterMod) {
        const fac = await this.prisma.programaDosFacilitador.findFirst({
          where: {
            facilitadorId: userId,
            estado: 'activo',
            programaDos: { programaId: masterMod.programaId }
          }
        });
        if (fac) isProgramFac = true;
      }

      if (!isDirectFac && !isProgramFac) throw new UnauthorizedException('No autorizado para este módulo');
    }

    return this.prisma.mod_unidad_tematica.update({
      where: { id: unidadId },
      data: { estado: 'eliminado' } // Soft delete
    });
  }

  // ─── RECURSOS (PDF, LINKS, VIDEOS) ──────────────────────────

  async crearRecurso(userId: string, data: any) {
    const unit = await this.prisma.mod_unidad_tematica.findUnique({ where: { id: data.unidadId } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');

    return this.prisma.mod_recurso.create({
      data: {
        unidadId: data.unidadId,
        titulo: data.titulo,
        tipo: data.tipo,
        url: data.url,
        descripcion: data.descripcion,
        orden: data.orden || 0,
        estado: 'activo'
      }
    });
  }

  async deleteRecurso(userId: string, id: string) {
    return this.prisma.mod_recurso.update({
      where: { id },
      data: { estado: 'eliminado' }
    });
  }

  async updateRecurso(userId: string, id: string, data: { titulo?: string; tipo?: string; url?: string; descripcion?: string }) {
    const recurso = await this.prisma.mod_recurso.findUnique({ where: { id } });
    if (!recurso) throw new NotFoundException('Recurso no encontrado');

    return this.prisma.mod_recurso.update({
      where: { id },
      data: {
        titulo: data.titulo ?? recurso.titulo,
        ...(data.tipo ? { tipo: data.tipo as any } : {}),
        url: data.url ?? recurso.url,
        descripcion: data.descripcion ?? recurso.descripcion,
      }
    });
  }

  async reordenarRecursos(userId: string, items: { id: string, orden: number }[]) {
    try {
      return await this.prisma.$transaction(
        items.map(item =>
          this.prisma.mod_recurso.update({
            where: { id: item.id },
            data: { orden: item.orden }
          })
        )
      );
    } catch (err) {
      console.error(`[ERROR] LmsService.reordenarRecursos:`, err);
      throw err;
    }
  }

  async reordenarActividades(userId: string, items: { id: string, orden: number }[]) {
    try {
      return await this.prisma.$transaction(
        items.map(item =>
          this.prisma.mod_actividad.update({
            where: { id: item.id },
            data: { orden: item.orden }
          })
        )
      );
    } catch (err) {
      console.error(`[ERROR] LmsService.reordenarActividades:`, err);
      throw err;
    }
  }

  // ─── UNIDADES TEMÁTICAS ───────────────────────────────────────

  async getEntregasPorActividad(userId: string, actividadId: string) {
    const act = await this.prisma.mod_actividad.findUnique({
      where: { id: actividadId },
      include: {
        unidad: true,
        tarea: true,
        foro: { include: { posts: true } }
      }
    });

    if (!act) throw new NotFoundException('Actividad no encontrada');

    // Verificar si es facilitador
    const isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
      where: { 
        facilitadorId: userId, 
        moduloId: act.unidad.moduloId || undefined, 
        estado: 'activo' 
      }
    });

    if (act.tipo === 'TAREA' && act.tarea) {
      const whereClause: any = { tareaId: act.tarea.id };
      if (!isFacilitador) whereClause.userId = userId;

      const entregas = await this.prisma.mod_entrega.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, nombre: true, apellidos: true, imagen: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Obtener notas para estas entregas
      const userIds = [...new Set(entregas.map(e => e.userId))];
      const notas = await this.prisma.mod_nota_actividad.findMany({
        where: {
          actividadId,
          userId: { in: userIds }
        }
      });

      return entregas.map(e => ({
        ...e,
        nota: notas.find(n => n.userId === e.userId) || null
      }));
    }

    if (act.tipo === 'FORO' && act.foro) {
      const whereClause: any = { foroId: act.foro.id, padreId: null };
      if (!isFacilitador) whereClause.userId = userId;

      const posts = await this.prisma.mod_foro_post.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, nombre: true, apellidos: true, imagen: true } }
        }
      });

      const notas = await this.prisma.mod_nota_actividad.findMany({
        where: { actividadId, userId: { in: posts.map(p => p.userId) } }
      });

      return posts.map(p => {
        const nota = notas.find(n => n.userId === p.userId);
        return {
          ...p,
          nota: nota ? { nota: nota.nota, observacion: nota.observacion } : null
        };
      });
    }

    return [];
  }

  async calificarEntrega(userId: string, data: { actividadId: string, targetUserId: string, nota: number, retro?: string, tipoTarget: 'TAREA' | 'FORO' }) {
    // 1. Verificar facultativo
    const act = await this.prisma.mod_actividad.findUnique({
      where: { id: data.actividadId },
      include: { unidad: true, tarea: true, foro: true }
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');

    const isFacReal = await this.prisma.programaDosFacilitador.findFirst({
      where: { 
        facilitadorId: userId, 
        OR: [
          { moduloId: act.unidad.moduloId || undefined },
          { moduloMaestroId: act.unidad.moduloMaestroId || undefined }
        ],
        estado: 'activo'
      }
    });
    if (!isFacReal) throw new UnauthorizedException('No autorizado');

    // 2. Si es TAREA, actualizar mod_entrega
    if (data.tipoTarget === 'TAREA' && act.tarea) {
      const entrega = await this.prisma.mod_entrega.findFirst({
        where: { tareaId: act.tarea.id, userId: data.targetUserId }
      });
      if (entrega) {
        await this.prisma.mod_entrega.update({
          where: { id: entrega.id },
          data: {
            nota: data.nota,
            retroalimentacion: data.retro,
            calificada: true
          }
        });
      }
    }

    // 3. Upsert nota oficial en mod_nota_actividad
    const notaOficial = await this.prisma.mod_nota_actividad.upsert({
      where: {
        actividadId_userId: {
          actividadId: data.actividadId,
          userId: data.targetUserId
        }
      },
      update: {
        nota: data.nota,
        observacion: data.retro
      },
      create: {
        actividadId: data.actividadId,
        userId: data.targetUserId,
        nota: data.nota,
        observacion: data.retro,
        entroRegistro: true
      }
    });

    // 4. Notificar al estudiante
    try {
      await this.notiService.emit({
        userId: data.targetUserId,
        titulo: `Actividad Calificada: ${act.titulo}`,
        mensaje: `Tu entrega en "${act.titulo}" ha sido calificada con ${data.nota} puntos.`,
        tipo: 'ENTREGA_CALIFICADA',
        linkRef: `/aula/curso/${act.unidad.moduloId}/actividad/${act.id}`
      });
    } catch (e) {
      console.error('Error enviando notificación de calificación:', e);
    }

    return notaOficial;
  }

  async getReporteCalificaciones(userId: string, moduloId: string, turnoId?: string) {
    // 1. Verificar facultador
    const isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
        where: {
            facilitadorId: userId,
            OR: [
                { moduloId: moduloId },
                { moduloMaestroId: moduloId }
            ],
            estado: 'activo'
        }
    });

    if (!isFacilitador) {
        const directMaster = await this.prisma.programaModulo.findFirst({
            where: { id: moduloId, facilitadorId: userId }
        }).catch(() => null);
        if (!directMaster) throw new ForbiddenException('No autorizado para ver este reporte');
    }

    // 2. Obtener todas las actividades calificables
    const actividades = await this.prisma.mod_actividad.findMany({
        where: {
            unidad: {
                OR: [
                    { moduloId: moduloId },
                    { moduloMaestroId: moduloId }
                ],
                estado: 'activo'
            },
            esCalificable: true,
            estado: { not: 'eliminado' }
        },
        include: {
            categoria: { include: { config: true } }
        },
        orderBy: [
          { unidad: { semana: 'asc' } },
          { orden: 'asc' }
        ]
    });

    // 3. Obtener estudiantes
    const estudiantes = await this.getEstudiantesPorCurso(moduloId, turnoId as any);

    // 4. Obtener todas las notas de los estudiantes para estas actividades
    const todasLasNotas = await this.prisma.mod_nota_actividad.findMany({
        where: {
            actividadId: { in: actividades.map(a => a.id) },
            userId: { in: estudiantes.map(e => e.personaId) }
        }
    });

    // 4.5 Obtener asistencias para insignias y reporte
    const sesiones = await this.prisma.mod_asistencia.findMany({
        where: {
            OR: [
                { moduloId: moduloId },
                { moduloMaestroId: moduloId }
            ]
        }
    });
    const asistenciasEntregadas = await this.prisma.mod_asistencia_reg.findMany({
        where: { 
            asistenciaId: { in: sesiones.map(s => s.id) },
            userId: { in: estudiantes.map(e => e.personaId) }
        }
    });

    // 4.6 Obtener insignias actuales
    const insigniasUser = await this.prisma.mod_insignia_user.findMany({
        where: { userId: { in: estudiantes.map(e => e.personaId) } },
        include: { insignia: true }
    });

    // 5. Armar la matriz de datos
    const reportData = estudiantes.map(est => {
        const fila: any = {
            userId: est.personaId,
            nombreCompleto: est.persona.nombreCompleto,
            scores: {},
            total: 0,
            asistencia: 0,
            insignias: insigniasUser.filter(iu => iu.userId === est.personaId).map(iu => iu.insignia) || []
        };

        // Calcular asistencia %
        const misAsis = asistenciasEntregadas.filter(a => a.userId === est.personaId);
        if (sesiones.length > 0) {
            const presentes = misAsis.filter(a => a.estado === 'P' || a.estado === 'T').length;
            fila.asistencia = Math.round((presentes / sesiones.length) * 100);
        }

        let totalPonderado = 0;
        
        // Agrupar actividades por categoría para calcular el total ponderado si es necesario
        // Pero para el reporte simple, sumaremos o mostraremos los puntos
        
        actividades.forEach(act => {
            const nota = todasLasNotas.find(n => n.actividadId === act.id && n.userId === est.personaId);
            fila.scores[act.id] = nota ? nota.nota : 0;
            // Suma simple para el "Total" (esto puede variar según la lógica de ponderación)
            // Si queremos ponderado, necesitamos la lógica de GradingController
        });

        // Cálculo de nota final (Simplificado: Suma de (nota / puntajeMax) * peso de categoría)
        // Agrupamos por categoría
        const cats = new Set(actividades.map(a => a.categoriaId));
        cats.forEach(catId => {
            if (!catId) return;
            const actvsInCat = actividades.filter(a => a.categoriaId === catId);
            const pesoCat = actvsInCat[0]?.categoria?.config?.peso || 0;
            const puntosMaxCat = actvsInCat.reduce((sum, a) => sum + a.puntajeMax, 0);
            const puntosObtenidosCat = actvsInCat.reduce((sum, a) => {
                const n = todasLasNotas.find(nota => nota.actividadId === a.id && nota.userId === est.personaId);
                return sum + (n ? n.nota : 0);
            }, 0);

            if (puntosMaxCat > 0) {
                totalPonderado += (puntosObtenidosCat / puntosMaxCat) * pesoCat;
            }
        });

        fila.total = Math.round(totalPonderado * 100) / 100;

        // --- CREATIVIDAD: OTORGAR INSIGNIAS AUTOMÁTICAS ---
        // 1. Alumno Estrella (Nota > 90)
        if (fila.total >= 90) this.awardInsigniaSilent(est.personaId, 'ALUMNO_ESTRELLA');
        // 2. Asistencia Perfecta (100%)
        if (fila.asistencia === 100 && sesiones.length > 5) this.awardInsigniaSilent(est.personaId, 'ASISTENCIA_PERFECTA');
        
        // Persistir en mod_nota_final si el curso ya tiene una configuración
        this.persistNotaFinal(est.personaId, moduloId, fila.total);

        return fila;
    });

    return {
        headers: actividades.map(a => ({
            id: a.id,
            titulo: a.titulo,
            tipo: a.tipo,
            puntajeMax: a.puntajeMax,
            categoriaId: a.categoriaId,
            categoriaNombre: a.categoria?.config?.nombre || 'General',
            categoriaOrden: a.categoria?.config?.orden || 0,
            orden: a.orden
        })).sort((a, b) => {
            if (a.categoriaOrden !== b.categoriaOrden) return a.categoriaOrden - b.categoriaOrden;
            return (a.orden || 0) - (b.orden || 0);
        }),
        estudiantes: reportData.sort((a,b) => b.total - a.total), // Sort by grade desc
        asistenciasPosibles: sesiones.length
    };
  }

  private async awardInsigniaSilent(userId: string, tipo: string) {
    try {
        const ins = await this.prisma.mod_insignia.findFirst({ where: { tipo } });
        if (!ins) return;
        const exists = await this.prisma.mod_insignia_user.findFirst({ 
            where: { userId, insigniaId: ins.id } 
        });
        if (!exists) {
            await this.prisma.mod_insignia_user.create({ data: { userId, insigniaId: ins.id } });
        }
    } catch (e) {}
  }

  private async persistNotaFinal(userId: string, moduloId: string, nota: number) {
      try {
          const isAprobado = nota >= 70;
          const estadoCalif = isAprobado ? 'aprobado' : 'reprobado';

          // Intentamos encontrar si ya existe
          const exists = await this.prisma.mod_nota_final.findFirst({
              where: { userId, moduloId }
          });
          if (exists) {
              await this.prisma.mod_nota_final.update({
                  where: { id: exists.id },
                  data: { notaTotal: nota, estadoCalif }
              });
          } else {
              await this.prisma.mod_nota_final.create({
                  data: { userId, moduloId, notaTotal: nota, estadoCalif }
              });
          }
      } catch (e) {
          console.error("Error persistiendo nota final:", e);
      }
  }
}
