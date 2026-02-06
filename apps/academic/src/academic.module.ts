import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { DatabaseModule } from '@app/database';
import {
  DuracionesController, DuracionesService,
  VersionesController, VersionesService,
  TiposController, TiposService,
  ModalidadesController, ModalidadesService,
  ModulosController, ModulosService,
  TurnosController, TurnosService,
  InscripcionesController, InscripcionesService,
  BauchersController, BauchersService,
  CalificacionesController, CalificacionesService,
  EventosController, EventosService,
  EventosTiposController, EventosTiposService,
  EventosInscripcionesController, EventosInscripcionesService,
  EventosPersonasController, EventosPersonasService
} from './academic-crud.controllers';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AcademicController,
    DuracionesController,
    VersionesController,
    TiposController,
    ModalidadesController,
    ModulosController,
    TurnosController,
    InscripcionesController,
    BauchersController,
    CalificacionesController,
    EventosController,
    EventosTiposController,
    EventosInscripcionesController,
    EventosPersonasController
  ],
  providers: [
    AcademicService,
    DuracionesService,
    VersionesService,
    TiposService,
    ModalidadesService,
    ModulosService,
    TurnosService,
    InscripcionesService,
    BauchersService,
    CalificacionesService,
    EventosService,
    EventosTiposService,
    EventosInscripcionesService,
    EventosPersonasService
  ],
})
export class AcademicModule { }
