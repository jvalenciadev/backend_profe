import { Controller, Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

@Injectable()
export class ProgramasService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'programa', true, true); }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter, estado: { not: 'ELIMINADO' } };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }
        return await this.prisma.programa.findMany({
            where,
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                },
                tipo: true,
                modalidad: true,
                duracion: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string, ability?: any) {
        let where: any = { estado: { not: 'ELIMINADO' } };
        // Allow searching by ID or Codigo
        if (id.length > 30) (where as any).id = id;
        else (where as any).codigo = id;

        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }
        return await this.prisma.programa.findFirst({
            where,
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                },
                tipo: true,
                modalidad: true,
                duracion: true,
                versionesOperativas: true
            }
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
                modulos: modulos ? {
                    create: modulos.map((m: any) => ({
                        codigo: m.codigo,
                        nombre: m.nombre,
                        descripcion: m.descripcion,
                        notaMinima: m.notaMinima,
                        estado: m.estado || 'ACTIVO',
                        createdBy: user?.id || undefined
                    }))
                } : undefined
            },
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                }
            }
        });
    }

    async update(id: string, data: any, user?: any, ability?: any) {
        const { modulos, id: _id, createdAt, updatedAt, tipo, modalidad, duracion, tipoId, modalidadId, duracionId, ...rest } = data;

        // Build the update data object
        const updateData: any = {
            ...rest,
            updatedBy: user?.id || undefined
        };

        // Handle tipo relation
        if (tipoId !== undefined) {
            updateData.tipo = tipoId ? { connect: { id: tipoId } } : { disconnect: true };
        }

        // Handle modalidad relation
        if (modalidadId !== undefined) {
            updateData.modalidad = modalidadId ? { connect: { id: modalidadId } } : { disconnect: true };
        }

        // Handle duracion relation
        if (duracionId !== undefined) {
            updateData.duracion = duracionId ? { connect: { id: duracionId } } : { disconnect: true };
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
                    estado: m.estado || 'ACTIVO',
                    createdBy: user?.id || undefined
                }))
            };
        }

        return await this.prisma.programa.update({
            where: { id },
            data: updateData,
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                }
            }
        });
    }
}
@Injectable()
export class ProgramaDosService extends GenericCrudService<any> {
    constructor(p: PrismaService) {
        super(p, 'programaDos', true, true);
    }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter, estado: { not: 'ELIMINADO' } };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }
        return await this.prisma.programaDos.findMany({
            where,
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                },
                turnos: true,
                tipo: true,
                modalidad: true,
                duracion: true,
                sede: true,
                programa: true,
                version: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string, ability?: any) {
        let where: any = { estado: { not: 'ELIMINADO' } };
        if (id.length > 30) (where as any).id = id;
        else (where as any).codigo = id;

        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }
        return await this.prisma.programaDos.findFirst({
            where,
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                },
                turnos: true,
                tipo: true,
                modalidad: true,
                duracion: true,
                sede: true,
                programa: true,
                version: true
            }
        });
    }

    async create(data: any, user?: any) {
        const { modulos, turnos, programaCodigo, ...rest } = data;

        // If a master program code is provided, link it
        if (programaCodigo && !rest.programaId) {
            const master = await this.prisma.programa.findUnique({ where: { codigo: programaCodigo } });
            if (master) {
                (rest as any).programaId = master.id;
            }
        }

        // Auto-asignar departamentoId (tenant) del usuario si no se proporciona
        if (!rest.departamentoId && user?.tenantId) {
            (rest as any).departamentoId = user.tenantId;
        }

        return await this.prisma.programaDos.create({
            data: {
                ...rest,
                createdBy: user?.id || undefined,
                modulos: modulos ? {
                    create: modulos.map(m => ({
                        codigo: m.codigo,
                        nombre: m.nombre,
                        descripcion: m.descripcion,
                        notaMinima: m.notaMinima,
                        fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : undefined,
                        fechaFin: m.fechaFin ? new Date(m.fechaFin) : undefined,
                        estado: m.estado || 'ACTIVO',
                        createdBy: user?.id || undefined
                    }))
                } : undefined,
                turnos: turnos ? {
                    create: turnos.map(t => ({
                        turnoIds: t.turnoIds,
                        cupo: t.cupo,
                        cupoPre: t.cupoPre || 0,
                        estado: t.estado || 'ACTIVO',
                        createdBy: user?.id || undefined
                    }))
                } : undefined
            },
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                },
                turnos: true,
                programa: true,
                tipo: true,
                modalidad: true,
                duracion: true,
                sede: true,
                version: true
            }
        });
    }

    async update(id: string, data: any, user?: any, ability?: any) {
        const { modulos, turnos, programaCodigo, id: _, modulos: __, createdAt, updatedAt, ...rest } = data;

        if (programaCodigo && !rest.programaId) {
            const master = await this.prisma.programa.findUnique({ where: { codigo: programaCodigo } });
            if (master) {
                (rest as any).programaId = master.id;
            }
        }

        return await this.prisma.programaDos.update({
            where: { id },
            data: {
                ...rest,
                updatedBy: user?.id || undefined,
                modulos: modulos ? {
                    deleteMany: {},
                    create: modulos.map(m => ({
                        codigo: m.codigo,
                        nombre: m.nombre,
                        descripcion: m.descripcion,
                        notaMinima: m.notaMinima,
                        fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : undefined,
                        fechaFin: m.fechaFin ? new Date(m.fechaFin) : undefined,
                        estado: m.estado || 'ACTIVO',
                        updatedBy: user?.id || undefined
                    }))
                } : undefined,
                turnos: turnos ? {
                    deleteMany: {},
                    create: turnos.map(t => ({
                        turnoIds: t.turnoIds,
                        cupo: t.cupo,
                        cupoPre: t.cupoPre || 0,
                        estado: t.estado || 'ACTIVO',
                        createdBy: user?.id || undefined,
                        updatedBy: user?.id || undefined
                    }))
                } : undefined
            },
            include: {
                modulos: {
                    orderBy: { nombre: 'asc' }
                },
                turnos: true,
                programa: true,
                version: true,
                sede: true
            }
        });
    }
}
@Injectable() export class ModulosService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaModulo', true, true); } }
@Injectable() export class ProgramaModuloDosService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaModuloDos', true, true); } }
@Injectable()
export class AsignacionesService extends GenericCrudService<any> {
    constructor(p: PrismaService) {
        super(p, 'programaDosFacilitador', true, true);
    }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter, estado: { not: 'ELIMINADO' } };

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
                turno: true,
                facilitador: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async create(data: any, user?: any) {
        const { moduloId, turnoId, ...rest } = data;

        // Buscar si ya existe una asignación para este módulo y turno (incluyendo las eliminadas)
        const existing = await this.prisma.programaDosFacilitador.findUnique({
            where: {
                moduloId_turnoId: { moduloId, turnoId }
            }
        });

        // Si existe y está activa, bloqueamos (Conflicto Real)
        if (existing && existing.estado !== 'ELIMINADO') {
            throw new ConflictException('Bloqueado: Este módulo y turno ya tienen un facilitador asignado.');
        }

        const auditData = this.hasAudit ? { updatedBy: user?.id || undefined } : {};

        // Si existe pero está eliminada, la RECICLAMOS (Reactivar)
        if (existing && existing.estado === 'ELIMINADO') {
            return await this.prisma.programaDosFacilitador.update({
                where: { id: existing.id },
                data: {
                    ...rest,
                    estado: 'ACTIVO',
                    deletedAt: null,
                    deletedBy: null,
                    ...auditData
                }
            });
        }

        // Si no existe, la creamos de cero
        const createAudit = this.hasAudit ? { ...auditData, createdBy: user?.id || undefined } : {};
        return await this.prisma.programaDosFacilitador.create({
            data: {
                moduloId,
                turnoId,
                ...rest,
                ...createAudit
            }
        });
    }
}
@Injectable() export class DuracionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaDuracion', true, true); } }
@Injectable() export class VersionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaVersion', true, true); } }
@Injectable() export class TiposService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaTipo', true, true); } }
@Injectable() export class ModalidadesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaModalidad', true, true); } }
@Injectable() export class TurnosService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaTurno', true, true); } }
@Injectable() export class InscripcionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaInscripcion', true, true); } }
@Injectable() export class BauchersService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaBaucher', true, true); } }
@Injectable() export class CalificacionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'calificacionParticipante', true, true); } }
@Injectable()
export class EventosService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'evento', true, true); }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter };
        if (this.hasStatus) where.estado = { not: 'ELIMINADO' };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }
        return await this.prisma.evento.findMany({
            where,
            include: { tipo: true, tenant: true },
            orderBy: { createdAt: 'desc' }
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
            include: { tipo: true, tenant: true, cuestionarios: true }
        });
    }
}

@Injectable()
export class EventosTiposService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'tipoEvento', true, true); }
}

@Injectable()
export class EventosInscripcionesService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'eventoInscripcion', true, true); }
}

@Injectable()
export class EventosPersonasService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'eventoPersona', true, true); }
}

@Injectable()
export class EstadosInscripcionService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'programaInscripcionEstado', true, true); }
}

@Injectable()
export class BlogsService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'blog', true, true); }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter };
        if (this.hasStatus) where.estado = { not: 'ELIMINADO' };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }
        return await this.prisma.blog.findMany({
            where,
            include: { tenant: true },
            orderBy: { createdAt: 'desc' }
        });
    }
}

@Injectable()
export class ComunicadosService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'comunicado', true, true); }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter };
        if (this.hasStatus) where.estado = { not: 'ELIMINADO' };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }
        return await this.prisma.comunicado.findMany({
            where,
            include: { tenant: true },
            orderBy: { createdAt: 'desc' }
        });
    }
}



@Controller('duraciones')
export class DuracionesController extends CrudControllerFactory('duraciones') {
    constructor(public service: DuracionesService) { super(service); }
}

@Controller('versiones')
export class VersionesController extends CrudControllerFactory('versiones') {
    constructor(public service: VersionesService) { super(service); }
}

@Controller('tipos')
export class TiposController extends CrudControllerFactory('tipos') {
    constructor(public service: TiposService) { super(service); }
}

@Controller('modalidades')
export class ModalidadesController extends CrudControllerFactory('modalidades') {
    constructor(public service: ModalidadesService) { super(service); }
}

// Modulos are now handled by ModulosController (Master) and ProgramaModuloDosController (Version)


@Controller('turnos')
export class TurnosController extends CrudControllerFactory('turnos') {
    constructor(public service: TurnosService) { super(service); }
}

@Controller('inscripciones')
export class InscripcionesController extends CrudControllerFactory('inscripciones') {
    constructor(public service: InscripcionesService) { super(service); }
}

@Controller('bauchers')
export class BauchersController extends CrudControllerFactory('bauchers') {
    constructor(public service: BauchersService) { super(service); }
}

@Controller('calificaciones')
export class CalificacionesController extends CrudControllerFactory('calificaciones') {
    constructor(public service: CalificacionesService) { super(service); }
}

// EVENTS
@Controller('eventos')
export class EventosController extends CrudControllerFactory('eventos') {
    constructor(public service: EventosService) { super(service); }
}

@Controller('tipos-evento')
export class EventosTiposController extends CrudControllerFactory('tipos-evento') {
    constructor(public service: EventosTiposService) { super(service); }
}

@Controller('eventos-inscripciones')
export class EventosInscripcionesController extends CrudControllerFactory('eventos-inscripciones') {
    constructor(public service: EventosInscripcionesService) { super(service); }
}

@Controller('evento-persona')
export class EventosPersonasController extends CrudControllerFactory('evento-persona') {
    constructor(public service: EventosPersonasService) { super(service); }
}

@Controller('estados-inscripcion')
export class EstadosInscripcionController extends CrudControllerFactory('estados-inscripcion') {
    constructor(public service: EstadosInscripcionService) { super(service); }
}

@Controller('programas-maestros')
export class ProgramasController extends CrudControllerFactory('programas-maestros') {
    constructor(public service: ProgramasService) { super(service); }
}

@Controller('modulos-maestros')
export class ModulosController extends CrudControllerFactory('modulos-maestros') {
    constructor(public service: ModulosService) { super(service); }
}

@Controller('programa-versiones')
export class ProgramaDosController extends CrudControllerFactory('programa-versiones') {
    constructor(public service: ProgramaDosService) { super(service); }
}

@Controller('programa-modulo-versiones')
export class ProgramaModuloDosController extends CrudControllerFactory('programa-modulo-versiones') {
    constructor(public service: ProgramaModuloDosService) { super(service); }
}

@Controller('programa-dos')
export class ProgramaBaseController extends CrudControllerFactory('programa-dos') {
    constructor(public service: ProgramaDosService) { super(service); }
}

@Controller('asignaciones-facilitadores')
export class AsignacionesController extends CrudControllerFactory('asignaciones-facilitadores') {
    constructor(public service: AsignacionesService) { super(service); }
}

@Controller('blogs')
export class BlogsController extends CrudControllerFactory('blogs') {
    constructor(public service: BlogsService) { super(service); }
}

@Controller('comunicados')
export class ComunicadosController extends CrudControllerFactory('comunicados') {
    constructor(public service: ComunicadosService) { super(service); }
}




@Injectable()
export class ProfeService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'profe', true, true); }

    async create(data: any, user?: any) {
        const count = await this.prisma.profe.count({
            where: { estado: { not: 'ELIMINADO' } }
        });

        if (count > 0) {
            throw new BadRequestException('Solo puede existir un registro de Información Institucional. Edite el existente.');
        }
        return super.create(data, user);
    }
}

@Controller('profe')
export class ProfeController extends CrudControllerFactory('profe') {
    constructor(public service: ProfeService) { super(service); }
}
