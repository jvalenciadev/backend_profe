import { Controller, Injectable } from '@nestjs/common';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

@Injectable()
export class CargosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'cargo');
  }
}

@Controller('cargos')
export class CargosController extends CrudControllerFactory('cargos') {
  constructor(public service: CargosService) {
    super(service);
  }
}
