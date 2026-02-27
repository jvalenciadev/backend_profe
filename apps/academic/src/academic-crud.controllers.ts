import {
  Controller,
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

@Injectable()
export class ProgramasService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programa', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter, estado: { not: 'eliminado' } };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.programa.findMany({
      where,
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
        tipo: true,
        modalidad: true,
        duracion: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ability?: any) {
    let where: any = { estado: { not: 'eliminado' } };

    // Determinar si buscamos por ID (UUID) o por Código
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    if (isUuid) where.id = id;
    else where.codigo = id;

    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }

    return await this.prisma.programa.findFirst({
      where,
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
        tipo: true,
        modalidad: true,
        duracion: true,
      },
    });
  }

  async create(data: any, user?: any) {
    const { modulos, ...rest } = data;
    // Clean relation IDs if they are empty strings
    if (rest.tipoId === '') delete rest.tipoId;
    if (rest.modalidadId === '') delete rest.modalidadId;
    if (rest.duracionId === '') delete rest.duracionId;

    return await this.prisma.programa.create({
      data: {
        ...rest,
        createdBy: user?.id || undefined,
        modulos: modulos
          ? {
            create: modulos.map((m: any) => ({
              codigo: m.codigo,
              nombre: m.nombre,
              descripcion: m.descripcion,
              notaMinima: m.notaMinima,
              estado: m.estado || 'activo',
              createdBy: user?.id || undefined,
            })),
          }
          : undefined,
      },
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
      },
    });
  }

  async update(id: string, data: any, user?: any, ability?: any) {
    const {
      modulos,
      id: _id,
      createdAt,
      updatedAt,
      tipo,
      modalidad,
      duracion,
      tipoId,
      modalidadId,
      duracionId,
      ...rest
    } = data;

    // Build the update data object
    const updateData: any = {
      ...rest,
      updatedBy: user?.id || undefined,
    };

    // Handle tipo relation
    if (tipoId !== undefined) {
      updateData.tipo = tipoId
        ? { connect: { id: tipoId } }
        : { disconnect: true };
    }

    // Handle modalidad relation
    if (modalidadId !== undefined) {
      updateData.modalidad = modalidadId
        ? { connect: { id: modalidadId } }
        : { disconnect: true };
    }

    // Handle duracion relation
    if (duracionId !== undefined) {
      updateData.duracion = duracionId
        ? { connect: { id: duracionId } }
        : { disconnect: true };
    }

    // Handle modulos
    if (modulos) {
      updateData.modulos = {
        deleteMany: {},
        create: modulos.map((m: any) => ({
          codigo: m.codigo,
          nombre: m.nombre,
          descripcion: m.descripcion,
          notaMinima: m.notaMinima,
          estado: m.estado || 'activo',
          createdBy: user?.id || undefined,
        })),
      };
    }

    return await this.prisma.programa.update({
      where: { id },
      data: updateData,
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
      },
    });
  }
}
@Injectable()
export class ProgramaDosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaDos', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter, estado: { not: 'eliminado' } };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.programaDos.findMany({
      where,
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
        turnos: true,
        tipo: true,
        modalidad: true,
        duracion: true,
        programa: true,
        version: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ability?: any) {
    let where: any = { estado: { not: 'eliminado' } };
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    if (isUuid) where.id = id;
    else where.codigo = id;

    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.programaDos.findFirst({
      where,
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
        turnos: true,
        tipo: true,
        modalidad: true,
        duracion: true,
        programa: true,
        version: true,
      },
    });
  }

  async create(data: any, user?: any) {
    const { modulos, turnos, programaCodigo, ...rest } = data;

    // If a master program code is provided, link it
    if (programaCodigo && !rest.programaId) {
      const master = await this.prisma.programa.findFirst({
        where: { codigo: programaCodigo },
      });
      if (master) {
        rest.programaId = master.id;
      }
    }

    // Auto-asignar departamentoId (tenant) del usuario si no se proporciona
    if (!rest.departamentoId && user?.tenantId) {
      rest.departamentoId = user.tenantId;
    }

    return await this.prisma.programaDos.create({
      data: {
        ...rest,
        createdBy: user?.id || undefined,
        modulos: modulos
          ? {
            create: modulos.map((m) => ({
              codigo: m.codigo,
              nombre: m.nombre,
              descripcion: m.descripcion,
              notaMinima: m.notaMinima,
              fechaInicio: m.fechaInicio
                ? new Date(m.fechaInicio)
                : undefined,
              fechaFin: m.fechaFin ? new Date(m.fechaFin) : undefined,
              estado: m.estado || 'activo',
              createdBy: user?.id || undefined,
            })),
          }
          : undefined,
        turnos: turnos
          ? {
            create: turnos.map((t) => ({
              turnoIds: t.turnoIds,
              cupo: t.cupo,
              cupoPre: t.cupoPre || 0,
              estado: t.estado || 'activo',
              createdBy: user?.id || undefined,
            })),
          }
          : undefined,
      },
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
        turnos: true,
        programa: true,
        tipo: true,
        modalidad: true,
        duracion: true,
        version: true,
      },
    });
  }

  async update(id: string, data: any, user?: any, ability?: any) {
    const {
      modulos,
      turnos,
      programaCodigo,
      id: _,
      modulos: __,
      createdAt,
      updatedAt,
      ...rest
    } = data;

    if (programaCodigo && !rest.programaId) {
      const master = await this.prisma.programa.findFirst({
        where: { codigo: programaCodigo },
      });
      if (master) {
        rest.programaId = master.id;
      }
    }

    return await this.prisma.programaDos.update({
      where: { id },
      data: {
        ...rest,
        updatedBy: user?.id || undefined,
        modulos: modulos
          ? {
            deleteMany: {},
            create: modulos.map((m) => ({
              codigo: m.codigo,
              nombre: m.nombre,
              descripcion: m.descripcion,
              notaMinima: m.notaMinima,
              fechaInicio: m.fechaInicio
                ? new Date(m.fechaInicio)
                : undefined,
              fechaFin: m.fechaFin ? new Date(m.fechaFin) : undefined,
              estado: m.estado || 'activo',
              updatedBy: user?.id || undefined,
            })),
          }
          : undefined,
        turnos: turnos
          ? {
            deleteMany: {},
            create: turnos.map((t) => ({
              turnoIds: t.turnoIds,
              cupo: t.cupo,
              cupoPre: t.cupoPre || 0,
              estado: t.estado || 'activo',
              createdBy: user?.id || undefined,
              updatedBy: user?.id || undefined,
            })),
          }
          : undefined,
      },
      include: {
        modulos: {
          orderBy: { nombre: 'asc' },
        },
        turnos: true,
        programa: true,
        version: true,
      },
    });
  }
}
@Injectable()
export class ModulosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaModulo', true, true);
  }
}
@Injectable()
export class ProgramaModuloDosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaModuloDos', true, true);
  }
}
@Injectable()
export class AsignacionesService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaDosFacilitador', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter, estado: { not: 'eliminado' } };

    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      if (caslWhere && Object.keys(caslWhere).length > 0) {
        where = { AND: [where, caslWhere] };
      }
    }

    return await this.prisma.programaDosFacilitador.findMany({
      where,
      include: {
        modulo: true,
        facilitador: true,
        programaDos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any, user?: any) {
    const { moduloId, facilitadorId, ...rest } = data;

    // Buscar si ya existe una asignación para este módulo y facilitador
    const existing = await this.prisma.programaDosFacilitador.findFirst({
      where: {
        moduloId,
        facilitadorId,
      },
    });

    // Si existe y está activa, bloqueamos
    if (existing && existing.estado !== 'eliminado') {
      throw new ConflictException(
        'Bloqueado: Este facilitador ya está asignado a este módulo.',
      );
    }

    const auditData = this.hasAudit ? { updatedBy: user?.id || undefined } : {};

    // Si existe pero está eliminada, la RECICLAMOS (Reactivar)
    if (existing && existing.estado === 'eliminado') {
      return await this.prisma.programaDosFacilitador.update({
        where: { id: existing.id },
        data: {
          ...rest,
          estado: 'activo',
          deletedAt: null,
          deletedBy: null,
          ...auditData,
        },
      });
    }

    // Si no existe, la creamos de cero
    const createAudit = this.hasAudit
      ? { ...auditData, createdBy: user?.id || undefined }
      : {};
    return await this.prisma.programaDosFacilitador.create({
      data: {
        moduloId,
        facilitadorId,
        programaDosId: data.programaDosId,
        modalidadId: data.modalidadId,
        ...rest,
        ...createAudit,
      },
    });
  }
}
@Injectable()
export class DuracionesService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaDuracion', true, true);
  }
}
@Injectable()
export class VersionesService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaVersion', true, true);
  }
}
@Injectable()
export class TiposService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaTipo', true, true);
  }
}
@Injectable()
export class ModalidadesService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaModalidad', true, true);
  }
}
@Injectable()
export class TurnosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaTurno', true, true);
  }
}
@Injectable()
export class InscripcionesService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaInscripcion', true, true);
  }
}
@Injectable()
export class BauchersService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programaBaucher', true, true);
  }
}
@Injectable()
export class CalificacionesService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'calificacionParticipante', true, true);
  }
}
@Injectable()
export class EventosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'evento', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter };
    if (this.hasStatus) where.estado = { not: 'eliminado' };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.evento.findMany({
      where,
      include: { tipo: true, tenant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ability?: any) {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.evento.findFirst({
      where,
      include: {
        tipo: true,
        tenant: true,
        cuestionarios: {
          where: { estado: { not: 'eliminado' } },
          include: {
            preguntas: {
              where: { estado: { not: 'eliminado' } },
              include: { opciones: { where: { estado: { not: 'eliminado' } } } },
            },
          },
        },
      },
    });
  }
}

@Injectable()
export class EventosTiposService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'tipoEvento', true, true);
  }
}

@Injectable()
export class EventosInscripcionesService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'eventoInscripcion', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter };
    if (this.hasStatus) where.estado = { not: 'eliminado' };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }

    // Traer todos con sus datos de la persona vinculada (muy útil para buscar por ci, nombre, etc. en el front)
    const inscripciones = await this.prisma.eventoInscripcion.findMany({
      where,
      include: { persona: true },
      orderBy: { createdAt: 'desc' },
    });

    // Anidar estado de evaluación a vuelo rasante (Super rápido sin saturar la DB)
    const eventoId = filter.eventoId;
    if (eventoId && inscripciones.length > 0) {
      const cuestionarios = await this.prisma.eventoCuestionario.findMany({
        where: { eventoId, estado: { not: 'eliminado' } },
        select: { id: true },
      });
      const cuestionarioIds = cuestionarios.map((c) => c.id);

      let personasConRespuestas = new Set<string>();
      if (cuestionarioIds.length > 0) {
        const respuestas = await this.prisma.evento_respuestas.findMany({
          where: { cuestionarioId: { in: cuestionarioIds } },
          select: { personaId: true },
          distinct: ['personaId'],
        });
        respuestas.forEach((r) => personasConRespuestas.add(r.personaId));
      }

      return inscripciones.map((ins: any) => ({
        ...ins,
        evaluaciones: personasConRespuestas.has(ins.personaId),
      }));
    }

    return inscripciones;
  }
}

@Injectable()
export class EventosPersonasService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'eventoPersona', true, true);
  }
}

@Injectable()
export class EstadosInscripcionService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'programa_inscripcion_estado', true, true);
  }
}

@Injectable()
export class EventoCuestionariosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'eventoCuestionario', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter };
    if (this.hasStatus) where.estado = { not: 'eliminado' };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.eventoCuestionario.findMany({
      where,
      include: {
        preguntas: {
          where: { estado: { not: 'eliminado' } },
          include: { opciones: { where: { estado: { not: 'eliminado' } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Injectable()
export class EventoPreguntasService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'evento_pregunta', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter };
    if (this.hasStatus) where.estado = { not: 'eliminado' };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.evento_pregunta.findMany({
      where,
      include: { opciones: { where: { estado: { not: 'eliminado' } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any, ability?: any) {
    const { opciones, ...preguntaData } = data;
    const pregunta = await this.prisma.evento_pregunta.create({ data: preguntaData });
    if (opciones?.length) {
      await this.prisma.evento_opciones.createMany({
        data: opciones.map((o: any) => ({ ...o, preguntaId: pregunta.id })),
      });
    }
    return this.prisma.evento_pregunta.findFirst({
      where: { id: pregunta.id },
      include: { opciones: true },
    });
  }

  async update(id: string, data: any, ability?: any) {
    const { opciones, ...preguntaData } = data;
    await this.prisma.evento_pregunta.update({ where: { id }, data: preguntaData });
    if (opciones) {
      // Eliminar opciones existentes y recrear
      await this.prisma.evento_opciones.deleteMany({ where: { preguntaId: id } });
      if (opciones.length) {
        await this.prisma.evento_opciones.createMany({
          data: opciones.map((o: any) => ({ texto: o.texto, esCorrecta: o.esCorrecta, preguntaId: id })),
        });
      }
    }
    return this.prisma.evento_pregunta.findFirst({
      where: { id },
      include: { opciones: true },
    });
  }
}

@Injectable()
export class BlogsService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'blog', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter };
    if (this.hasStatus) where.estado = { not: 'eliminado' };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.blog.findMany({
      where,
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Injectable()
export class ComunicadosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'comunicado', true, true);
  }

  async findAll(filter: any = {}, ability?: any) {
    let where: any = { ...filter };
    if (this.hasStatus) where.estado = { not: 'eliminado' };
    if (ability) {
      const caslWhere = this.getCaslWhere(ability, 'read');
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.comunicado.findMany({
      where,
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Controller('duraciones')
export class DuracionesController extends CrudControllerFactory('duraciones') {
  constructor(public service: DuracionesService) {
    super(service);
  }
}

@Controller('versiones')
export class VersionesController extends CrudControllerFactory('versiones') {
  constructor(public service: VersionesService) {
    super(service);
  }
}

@Controller('tipos')
export class TiposController extends CrudControllerFactory('tipos') {
  constructor(public service: TiposService) {
    super(service);
  }
}

@Controller('modalidades')
export class ModalidadesController extends CrudControllerFactory(
  'modalidades',
) {
  constructor(public service: ModalidadesService) {
    super(service);
  }
}

// Modulos are now handled by ModulosController (Master) and ProgramaModuloDosController (Version)

@Controller('turnos')
export class TurnosController extends CrudControllerFactory('turnos') {
  constructor(public service: TurnosService) {
    super(service);
  }
}

@Controller('inscripciones')
export class InscripcionesController extends CrudControllerFactory(
  'inscripciones',
) {
  constructor(public service: InscripcionesService) {
    super(service);
  }
}

@Controller('bauchers')
export class BauchersController extends CrudControllerFactory('bauchers') {
  constructor(public service: BauchersService) {
    super(service);
  }
}

@Controller('calificaciones')
export class CalificacionesController extends CrudControllerFactory(
  'calificaciones',
) {
  constructor(public service: CalificacionesService) {
    super(service);
  }
}

// EVENTS
@Controller('eventos')
export class EventosController extends CrudControllerFactory('eventos') {
  constructor(public service: EventosService) {
    super(service);
  }
}

@Controller('tipos-evento')
export class EventosTiposController extends CrudControllerFactory(
  'tipos-evento',
) {
  constructor(public service: EventosTiposService) {
    super(service);
  }
}

@Controller('eventos-inscripciones')
export class EventosInscripcionesController extends CrudControllerFactory(
  'eventos-inscripciones',
) {
  constructor(public service: EventosInscripcionesService) {
    super(service);
  }
}

@Controller('evento-persona')
export class EventosPersonasController extends CrudControllerFactory(
  'evento-persona',
) {
  constructor(public service: EventosPersonasService) {
    super(service);
  }
}

@Controller('estados-inscripcion')
export class EstadosInscripcionController extends CrudControllerFactory(
  'estados-inscripcion',
) {
  constructor(public service: EstadosInscripcionService) {
    super(service);
  }
}

@Controller('evento-cuestionarios')
export class EventoCuestionariosController extends CrudControllerFactory(
  'evento-cuestionarios',
) {
  constructor(public service: EventoCuestionariosService) {
    super(service);
  }
}

@Controller('evento-preguntas')
export class EventoPreguntasController extends CrudControllerFactory(
  'evento-preguntas',
) {
  constructor(public service: EventoPreguntasService) {
    super(service);
  }
}

@Controller('programas-maestros')
export class ProgramasController extends CrudControllerFactory(
  'programas-maestros',
) {
  constructor(public service: ProgramasService) {
    super(service);
  }
}

@Controller('modulos-maestros')
export class ModulosController extends CrudControllerFactory(
  'modulos-maestros',
) {
  constructor(public service: ModulosService) {
    super(service);
  }
}

@Controller('programa-versiones')
export class ProgramaDosController extends CrudControllerFactory(
  'programa-versiones',
) {
  constructor(public service: ProgramaDosService) {
    super(service);
  }
}

@Controller('programa-modulo-versiones')
export class ProgramaModuloDosController extends CrudControllerFactory(
  'programa-modulo-versiones',
) {
  constructor(public service: ProgramaModuloDosService) {
    super(service);
  }
}

@Controller('programa-dos')
export class ProgramaBaseController extends CrudControllerFactory(
  'programa-dos',
) {
  constructor(public service: ProgramaDosService) {
    super(service);
  }
}

@Controller('asignaciones-facilitadores')
export class AsignacionesController extends CrudControllerFactory(
  'asignaciones-facilitadores',
) {
  constructor(public service: AsignacionesService) {
    super(service);
  }
}

@Controller('blogs')
export class BlogsController extends CrudControllerFactory('blogs') {
  constructor(public service: BlogsService) {
    super(service);
  }
}

@Controller('comunicados')
export class ComunicadosController extends CrudControllerFactory(
  'comunicados',
) {
  constructor(public service: ComunicadosService) {
    super(service);
  }
}
