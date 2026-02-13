import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TerritorialController } from './territorial.controller';
import { TerritorialService } from './territorial.service';
import { DepartmentsModule } from './departments/departments.module';
import {
  SedesController, SedesService,
  DistritosController, DistritosService,
  ProvinciasController, ProvinciasService,
  UnidadEducativaController, UnidadEducativaService,
  GaleriasController, GaleriasService
} from './territorial-crud.controllers';

@Module({
  imports: [DepartmentsModule, DatabaseModule],
  controllers: [
    TerritorialController,
    SedesController,
    DistritosController,
    ProvinciasController,
    UnidadEducativaController,
    GaleriasController
  ],
  providers: [
    TerritorialService,
    SedesService,
    DistritosService,
    ProvinciasService,
    UnidadEducativaService,
    GaleriasService
  ],
})
export class TerritorialModule { }
