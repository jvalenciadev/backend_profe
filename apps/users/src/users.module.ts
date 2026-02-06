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

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [
    UsersController,
    RolesController,
    PermissionsController,
    PersonasController,
    AreasController,
    GenerosController
  ],
  providers: [
    UsersService,
    RolesService,
    PermissionsService,
    PersonasService,
    AreasService,
    GenerosService
  ],
})
export class UsersModule { }
