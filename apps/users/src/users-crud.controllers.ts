import { Controller, Injectable } from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

@Injectable() export class RolesService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'role', false); } }
@Injectable() export class PermissionsService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'permission', false); } }
@Injectable() export class PersonasService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'mapPersona'); } }
@Injectable() export class AreasService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'areaTrabajo'); } }
@Injectable() export class GenerosService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'genero'); } }

@Controller('roles')
export class RolesController extends CrudControllerFactory('roles') {
    constructor(public service: RolesService) { super(service); }
}

@Controller('permissions')
export class PermissionsController extends CrudControllerFactory('permissions') {
    constructor(public service: PermissionsService) { super(service); }
}

@Controller('personas')
export class PersonasController extends CrudControllerFactory('personas') {
    constructor(public service: PersonasService) { super(service); }
}

@Controller('areas')
export class AreasController extends CrudControllerFactory('areas') {
    constructor(public service: AreasService) { super(service); }
}

@Controller('generos')
export class GenerosController extends CrudControllerFactory('generos') {
    constructor(public service: GenerosService) { super(service); }
}

