import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { PROGRAMAVERSION_REPOSITORY } from './domain/repositories/programa-version.repository.interface';
import { PrismaProgramaVersionRepository } from './infrastructure/database/prisma-programa-version.repository';
import { ProgramaVersionController } from './infrastructure/controllers/programa-version.controller';
import {
  GetProgramaVersionsUseCase,
  GetProgramaVersionByIdUseCase,
  CreateProgramaVersionUseCase,
  UpdateProgramaVersionUseCase,
  DeleteProgramaVersionUseCase,
} from './application/use-cases/programa-version.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [ProgramaVersionController],
  providers: [
    {
      provide: PROGRAMAVERSION_REPOSITORY,
      useClass: PrismaProgramaVersionRepository,
    },
    GetProgramaVersionsUseCase,
    GetProgramaVersionByIdUseCase,
    CreateProgramaVersionUseCase,
    UpdateProgramaVersionUseCase,
    DeleteProgramaVersionUseCase,
  ],
  exports: [GetProgramaVersionsUseCase, GetProgramaVersionByIdUseCase],
})
export class ProgramaVersionModule {}
