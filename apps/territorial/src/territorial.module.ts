import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TerritorialController } from './territorial.controller';
import { TerritorialService } from './territorial.service';
import { DepartmentsModule } from './departments/departments.module';
import {
  SedesController,
  SedesService,
  DistritosController,
  DistritosService,
  GaleriasController,
  GaleriasService,
} from './territorial-crud.controllers';

@Module({
  imports: [DepartmentsModule, DatabaseModule],
  controllers: [
    TerritorialController,
    SedesController,
    DistritosController,
    GaleriasController,
  ],
  providers: [
    TerritorialService,
    SedesService,
    DistritosService,
    GaleriasService,
  ],
})
export class TerritorialModule { }
