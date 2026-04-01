import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { EVENTOPREGUNTA_REPOSITORY } from './domain/repositories/evento-pregunta.repository.interface';
import { PrismaEventoPreguntaRepository } from './infrastructure/database/prisma-evento-pregunta.repository';
import { EventoPreguntaController } from './infrastructure/controllers/evento-pregunta.controller';
import {
  GetEventoPreguntasUseCase,
  GetEventoPreguntaByIdUseCase,
  CreateEventoPreguntaUseCase,
  UpdateEventoPreguntaUseCase,
  DeleteEventoPreguntaUseCase,
} from './application/use-cases/evento-pregunta.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [EventoPreguntaController],
  providers: [
    {
      provide: EVENTOPREGUNTA_REPOSITORY,
      useClass: PrismaEventoPreguntaRepository,
    },
    GetEventoPreguntasUseCase,
    GetEventoPreguntaByIdUseCase,
    CreateEventoPreguntaUseCase,
    UpdateEventoPreguntaUseCase,
    DeleteEventoPreguntaUseCase,
  ],
  exports: [GetEventoPreguntasUseCase, GetEventoPreguntaByIdUseCase],
})
export class EventoPreguntaModule {}
