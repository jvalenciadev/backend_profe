import { Controller, Injectable } from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

@Injectable() export class DuracionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaDuracion'); } }
@Injectable() export class VersionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaVersion'); } }
@Injectable() export class TiposService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaTipo'); } }
@Injectable() export class ModalidadesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaModalidad'); } }
@Injectable() export class ModulosService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaModulo'); } }
@Injectable() export class TurnosService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaTurno'); } }
@Injectable() export class InscripcionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaInscripcion'); } }
@Injectable() export class BauchersService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'programaBaucher', false); } }
@Injectable() export class CalificacionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'calificacionParticipante', false); } }
@Injectable() export class EventosService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'evento'); } }
@Injectable() export class EventosTiposService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'tipoEvento'); } }
@Injectable() export class EventosInscripcionesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'eventoInscripcion'); } }
@Injectable() export class EventosPersonasService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'eventoPersona', false); } }

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

@Controller('modulos')
export class ModulosController extends CrudControllerFactory('modulos') {
    constructor(public service: ModulosService) { super(service); }
}

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

@Controller('eventos-tipos')
export class EventosTiposController extends CrudControllerFactory('eventos-tipos') {
    constructor(public service: EventosTiposService) { super(service); }
}

@Controller('eventos-inscripciones')
export class EventosInscripcionesController extends CrudControllerFactory('eventos-inscripciones') {
    constructor(public service: EventosInscripcionesService) { super(service); }
}

@Controller('eventos-personas')
export class EventosPersonasController extends CrudControllerFactory('eventos-personas') {
    constructor(public service: EventosPersonasService) { super(service); }
}

