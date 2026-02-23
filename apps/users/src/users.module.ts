import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseModule } from '@app/database';
import {
  RolesController,
  RolesService,
  PermissionsController,
  PermissionsService,
  PersonasController,
  PersonasService,
  AreasController,
  AreasService,
  GenerosController,
  GenerosService,
} from './users-crud.controllers';

import { CommonModule } from '@app/common';
import { CargosController, CargosService } from './hr-crud.controllers';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { ProfeController, ProfeService } from './profe.controller';
import { BancoProfesionalController } from './banco-profesional.controller';
import { BancoProfesionalService } from './banco-profesional.service';
import { PublicBancoProfesionalController } from './public-banco-profesional.controller';

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
    EvaluationsController,
    ProfeController,
    PublicBancoProfesionalController,
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
    EvaluationsService,
    ProfeService,
  ],
})
export class UsersModule {}
