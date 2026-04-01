import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { PROGRAMAMODULOVERSION_REPOSITORY } from './domain/repositories/programa-modulo-version.repository.interface';
import { PrismaProgramaModuloVersionRepository } from './infrastructure/database/prisma-programa-modulo-version.repository';
import { ProgramaModuloVersionController } from './infrastructure/controllers/programa-modulo-version.controller';
import {
  GetProgramaModuloVersionsUseCase,
  GetProgramaModuloVersionByIdUseCase,
  CreateProgramaModuloVersionUseCase,
  UpdateProgramaModuloVersionUseCase,
  DeleteProgramaModuloVersionUseCase,
} from './application/use-cases/programa-modulo-version.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [ProgramaModuloVersionController],
  providers: [
    {
      provide: PROGRAMAMODULOVERSION_REPOSITORY,
      useClass: PrismaProgramaModuloVersionRepository,
    },
    GetProgramaModuloVersionsUseCase,
    GetProgramaModuloVersionByIdUseCase,
    CreateProgramaModuloVersionUseCase,
    UpdateProgramaModuloVersionUseCase,
    DeleteProgramaModuloVersionUseCase,
  ],
  exports: [
    GetProgramaModuloVersionsUseCase,
    GetProgramaModuloVersionByIdUseCase,
  ],
})
export class ProgramaModuloVersionModule {}
