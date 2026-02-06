import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TerritorialController } from './territorial.controller';
import { TerritorialService } from './territorial.service';
import { DepartmentsModule } from './departments/departments.module';
import {
  SedesController, SedesService,
  DistritosController, DistritosService,
  ProvinciasController, ProvinciasService,
  UnidadEducativaController, UnidadEducativaService
} from './territorial-crud.controllers';

@Module({
  imports: [DepartmentsModule, DatabaseModule],
  controllers: [
    TerritorialController,
    SedesController,
    DistritosController,
    ProvinciasController,
    UnidadEducativaController
  ],
  providers: [
    TerritorialService,
    SedesService,
    DistritosService,
    ProvinciasService,
    UnidadEducativaService
  ],
})
export class TerritorialModule { }
