import { Controller, Injectable } from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

// Sede
@Injectable()
export class SedesService extends GenericCrudService<any> {
    constructor(prisma: PrismaService) { super(prisma, 'sede'); }
}
@Controller('sedes')
export class SedesController extends CrudControllerFactory('sedes') {
    constructor(public service: SedesService) { super(service); }
}

// Distrito
@Injectable()
export class DistritosService extends GenericCrudService<any> {
    constructor(prisma: PrismaService) { super(prisma, 'distrito'); }
}
@Controller('distritos')
export class DistritosController extends CrudControllerFactory('distritos') {
    constructor(public service: DistritosService) { super(service); }
}

// Provincia
@Injectable()
export class ProvinciasService extends GenericCrudService<any> {
    constructor(prisma: PrismaService) { super(prisma, 'provincia'); }
}
@Controller('provincias')
export class ProvinciasController extends CrudControllerFactory('provincias') {
    constructor(public service: ProvinciasService) { super(service); }
}

// UnidadEducativa
@Injectable()
export class UnidadEducativaService extends GenericCrudService<any> {
    constructor(prisma: PrismaService) { super(prisma, 'unidadEducativa'); }
}
@Controller('unidades-educativas')
export class UnidadEducativaController extends CrudControllerFactory('unidades-educativas') {
    constructor(public service: UnidadEducativaService) { super(service); }
}
