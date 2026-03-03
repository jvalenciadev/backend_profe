import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { EVENTOCUESTIONARIO_REPOSITORY } from './domain/repositories/evento-cuestionario.repository.interface';
import { PrismaEventoCuestionarioRepository } from './infrastructure/database/prisma-evento-cuestionario.repository';
import { EventoCuestionarioController } from './infrastructure/controllers/evento-cuestionario.controller';
import {
  GetEventoCuestionariosUseCase, GetEventoCuestionarioByIdUseCase, CreateEventoCuestionarioUseCase, UpdateEventoCuestionarioUseCase, DeleteEventoCuestionarioUseCase
} from './application/use-cases/evento-cuestionario.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [EventoCuestionarioController],
  providers: [
    { provide: EVENTOCUESTIONARIO_REPOSITORY, useClass: PrismaEventoCuestionarioRepository },
    GetEventoCuestionariosUseCase,
    GetEventoCuestionarioByIdUseCase,
    CreateEventoCuestionarioUseCase,
    UpdateEventoCuestionarioUseCase,
    DeleteEventoCuestionarioUseCase,
  ],
  exports: [GetEventoCuestionariosUseCase, GetEventoCuestionarioByIdUseCase]
})
export class EventoCuestionarioModule {}