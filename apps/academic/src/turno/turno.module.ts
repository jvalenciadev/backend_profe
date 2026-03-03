import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { TURNO_REPOSITORY } from './domain/repositories/turno.repository.interface';
import { PrismaTurnoRepository } from './infrastructure/database/prisma-turno.repository';
import { TurnoController } from './infrastructure/controllers/turno.controller';
import {
  GetTurnosUseCase, GetTurnoByIdUseCase, CreateTurnoUseCase, UpdateTurnoUseCase, DeleteTurnoUseCase
} from './application/use-cases/turno.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [TurnoController],
  providers: [
    { provide: TURNO_REPOSITORY, useClass: PrismaTurnoRepository },
    GetTurnosUseCase,
    GetTurnoByIdUseCase,
    CreateTurnoUseCase,
    UpdateTurnoUseCase,
    DeleteTurnoUseCase,
  ],
  exports: [GetTurnosUseCase, GetTurnoByIdUseCase]
})
export class TurnoModule {}