import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { EVENTO_REPOSITORY } from './domain/repositories/evento.repository.interface';
import { PrismaEventoRepository } from './infrastructure/database/prisma-evento.repository';
import { EventosController } from './infrastructure/controllers/eventos.controller';
import {
  GetEventosUseCase,
  GetEventoByIdUseCase,
  CreateEventoUseCase,
  UpdateEventoUseCase,
  DeleteEventoUseCase,
} from './application/use-cases/evento.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [EventosController],
  providers: [
    { provide: EVENTO_REPOSITORY, useClass: PrismaEventoRepository },
    GetEventosUseCase,
    GetEventoByIdUseCase,
    CreateEventoUseCase,
    UpdateEventoUseCase,
    DeleteEventoUseCase,
  ],
})
export class EventoModule {}
