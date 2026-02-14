import { Controller, Injectable } from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

@Injectable()
export class CargosService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'cargo'); }
}

@Injectable()
export class BancoProfesionalService extends GenericCrudService<any> {
    constructor(p: PrismaService) { super(p, 'bancoProfesional', true, true); }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter, estado: { not: 'ELIMINADO' } };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }

        return this.prisma.bancoProfesional.findMany({
            where,
            include: {
                cargo: true
            }
        });
    }

    async findOne(id: string, ability?: any) {
        let where: any = { id, estado: { not: 'ELIMINADO' } };
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }

        return this.prisma.bancoProfesional.findFirst({
            where,
            include: {
                cargo: true
            }
        });
    }
}

@Controller('cargos')
export class CargosController extends CrudControllerFactory('cargos') {
    constructor(public service: CargosService) { super(service); }
}

@Controller('banco-profesional')
export class BancoProfesionalController extends CrudControllerFactory('banco-profesional') {
    constructor(public service: BancoProfesionalService) { super(service); }
}
