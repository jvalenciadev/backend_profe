import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { MODULOMAESTRO_REPOSITORY } from './domain/repositories/modulo-maestro.repository.interface';
import { PrismaModuloMaestroRepository } from './infrastructure/database/prisma-modulo-maestro.repository';
import { ModuloMaestroController } from './infrastructure/controllers/modulo-maestro.controller';
import {
  GetModuloMaestrosUseCase,
  GetModuloMaestroByIdUseCase,
  CreateModuloMaestroUseCase,
  UpdateModuloMaestroUseCase,
  DeleteModuloMaestroUseCase,
} from './application/use-cases/modulo-maestro.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [ModuloMaestroController],
  providers: [
    {
      provide: MODULOMAESTRO_REPOSITORY,
      useClass: PrismaModuloMaestroRepository,
    },
    GetModuloMaestrosUseCase,
    GetModuloMaestroByIdUseCase,
    CreateModuloMaestroUseCase,
    UpdateModuloMaestroUseCase,
    DeleteModuloMaestroUseCase,
  ],
  exports: [GetModuloMaestrosUseCase, GetModuloMaestroByIdUseCase],
})
export class ModuloMaestroModule {}
