import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { EVENTOPERSONA_REPOSITORY } from './domain/repositories/evento-persona.repository.interface';
import { PrismaEventoPersonaRepository } from './infrastructure/database/prisma-evento-persona.repository';
import { EventoPersonaController } from './infrastructure/controllers/evento-persona.controller';
import {
  GetEventoPersonasUseCase, GetEventoPersonaByIdUseCase, CreateEventoPersonaUseCase, UpdateEventoPersonaUseCase, DeleteEventoPersonaUseCase
} from './application/use-cases/evento-persona.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [EventoPersonaController],
  providers: [
    { provide: EVENTOPERSONA_REPOSITORY, useClass: PrismaEventoPersonaRepository },
    GetEventoPersonasUseCase,
    GetEventoPersonaByIdUseCase,
    CreateEventoPersonaUseCase,
    UpdateEventoPersonaUseCase,
    DeleteEventoPersonaUseCase,
  ],
  exports: [GetEventoPersonasUseCase, GetEventoPersonaByIdUseCase]
})
export class EventoPersonaModule {}