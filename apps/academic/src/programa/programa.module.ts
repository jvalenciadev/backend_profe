import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { PROGRAMA_REPOSITORY } from './domain/repositories/programa.repository.interface';
import { PrismaProgramaRepository } from './infrastructure/database/prisma-programa.repository';
import { ProgramaController } from './infrastructure/controllers/programa.controller';
import { CreateProgramaUseCase } from './application/use-cases/create-programa.use-case';
import { GetProgramasUseCase, GetProgramaByIdUseCase } from './application/use-cases/get-programas.use-case';
import { UpdateProgramaUseCase, DeleteProgramaUseCase } from './application/use-cases/update-programa.use-case';

@Module({
  imports: [DatabaseModule],
  controllers: [ProgramaController],
  providers: [
    { provide: PROGRAMA_REPOSITORY, useClass: PrismaProgramaRepository },
    CreateProgramaUseCase,
    GetProgramasUseCase,
    GetProgramaByIdUseCase,
    UpdateProgramaUseCase,
    DeleteProgramaUseCase,
  ],
  exports: [GetProgramasUseCase, PROGRAMA_REPOSITORY],
})
export class ProgramaModule { }
