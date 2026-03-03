import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { EVENTOINSCRIPCION_REPOSITORY } from './domain/repositories/evento-inscripcion.repository.interface';
import { PrismaEventoInscripcionRepository } from './infrastructure/database/prisma-evento-inscripcion.repository';
import { EventoInscripcionController } from './infrastructure/controllers/evento-inscripcion.controller';
import {
  GetEventoInscripcionsUseCase, GetEventoInscripcionByIdUseCase, CreateEventoInscripcionUseCase, UpdateEventoInscripcionUseCase, DeleteEventoInscripcionUseCase
} from './application/use-cases/evento-inscripcion.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [EventoInscripcionController],
  providers: [
    { provide: EVENTOINSCRIPCION_REPOSITORY, useClass: PrismaEventoInscripcionRepository },
    GetEventoInscripcionsUseCase,
    GetEventoInscripcionByIdUseCase,
    CreateEventoInscripcionUseCase,
    UpdateEventoInscripcionUseCase,
    DeleteEventoInscripcionUseCase,
  ],
  exports: [GetEventoInscripcionsUseCase, GetEventoInscripcionByIdUseCase]
})
export class EventoInscripcionModule {}