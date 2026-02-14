import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseModule } from '@app/database';
import {
  RolesController, RolesService,
  PermissionsController, PermissionsService,
  PersonasController, PersonasService,
  AreasController, AreasService,
  GenerosController, GenerosService
} from './users-crud.controllers';

import { CommonModule } from '@app/common';
import { CargosController, CargosService, BancoProfesionalController, BancoProfesionalService } from './hr-crud.controllers';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [
    UsersController,
    RolesController,
    PermissionsController,
    PersonasController,
    AreasController,
    GenerosController,
    CargosController,
    BancoProfesionalController,
    EvaluationsController
  ],
  providers: [
    UsersService,
    RolesService,
    PermissionsService,
    PersonasService,
    AreasService,
    GenerosService,
    CargosService,
    BancoProfesionalService,
    EvaluationsService
  ],
})
export class UsersModule { }
