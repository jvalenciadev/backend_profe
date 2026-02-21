import { Controller, Injectable } from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

@Injectable()
export class RolesService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'role', true, true); }

    async create(data: any, user?: any) {
        const { permissions, ...roleData } = data;
        // Ensure guardName is present
        if (!roleData.guardName) roleData.guardName = 'api';

        return this.prisma.role.create({
            data: {
                ...roleData,
                permissions: permissions ? {
                    create: permissions.map((p: any) => ({
                        permissionId: p.id || p
                    }))
                } : undefined
            }
        });
    }

    async update(id: string, data: any, user?: any, ability?: any) {
        const { permissions, ...roleData } = data;

        return this.prisma.role.update({
            where: { id },
            data: {
                ...roleData,
                permissions: permissions ? {
                    deleteMany: {},
                    create: permissions.map((p: any) => ({
                        permissionId: p.id || p
                    }))
                } : undefined
            }
        });
    }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter, estado: { not: 'eliminado' } };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }

        return this.prisma.role.findMany({
            where,
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }

    async findOne(id: string, ability?: any) {
        let where: any = { id, estado: { not: 'eliminado' } };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }

        return this.prisma.role.findFirst({
            where,
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }
}

@Injectable()
export class PermissionsService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'permission', true, true); }

    async create(data: any, user?: any) {
        if (!data.guardName) data.guardName = 'api';
        return super.create(data, user);
    }
}
@Injectable() export class PersonasService extends GenericCrudService<any> { constructor(p: PrismaService) { super(p, 'mapPersona', true, true); } }
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

