import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { EVENTOTIPO_REPOSITORY } from './domain/repositories/evento-tipo.repository.interface';
import { PrismaEventoTipoRepository } from './infrastructure/database/prisma-evento-tipo.repository';
import { EventoTipoController } from './infrastructure/controllers/evento-tipo.controller';
import {
  GetEventoTiposUseCase, GetEventoTipoByIdUseCase, CreateEventoTipoUseCase, UpdateEventoTipoUseCase, DeleteEventoTipoUseCase
} from './application/use-cases/evento-tipo.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [EventoTipoController],
  providers: [
    { provide: EVENTOTIPO_REPOSITORY, useClass: PrismaEventoTipoRepository },
    GetEventoTiposUseCase,
    GetEventoTipoByIdUseCase,
    CreateEventoTipoUseCase,
    UpdateEventoTipoUseCase,
    DeleteEventoTipoUseCase,
  ],
  exports: [GetEventoTiposUseCase, GetEventoTipoByIdUseCase]
})
export class EventoTipoModule {}