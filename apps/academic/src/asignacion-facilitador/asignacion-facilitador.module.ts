import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { ASIGNACIONFACILITADOR_REPOSITORY } from './domain/repositories/asignacion-facilitador.repository.interface';
import { PrismaAsignacionFacilitadorRepository } from './infrastructure/database/prisma-asignacion-facilitador.repository';
import { AsignacionFacilitadorController } from './infrastructure/controllers/asignacion-facilitador.controller';
import {
  GetAsignacionFacilitadorsUseCase, GetAsignacionFacilitadorByIdUseCase, CreateAsignacionFacilitadorUseCase, UpdateAsignacionFacilitadorUseCase, DeleteAsignacionFacilitadorUseCase
} from './application/use-cases/asignacion-facilitador.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [AsignacionFacilitadorController],
  providers: [
    { provide: ASIGNACIONFACILITADOR_REPOSITORY, useClass: PrismaAsignacionFacilitadorRepository },
    GetAsignacionFacilitadorsUseCase,
    GetAsignacionFacilitadorByIdUseCase,
    CreateAsignacionFacilitadorUseCase,
    UpdateAsignacionFacilitadorUseCase,
    DeleteAsignacionFacilitadorUseCase,
  ],
  exports: [GetAsignacionFacilitadorsUseCase, GetAsignacionFacilitadorByIdUseCase]
})
export class AsignacionFacilitadorModule {}