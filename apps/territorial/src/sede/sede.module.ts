import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { SEDE_REPOSITORY } from './domain/repositories/sede.repository.interface';
import { PrismaSedeRepository } from './infrastructure/database/prisma-sede.repository';
import { SedeController } from './infrastructure/controllers/sede.controller';
import { CreateSedeUseCase } from './application/use-cases/create-sede.use-case';
import { GetSedesUseCase, GetSedeByIdUseCase } from './application/use-cases/get-sedes.use-case';
import { UpdateSedeUseCase, DeleteSedeUseCase } from './application/use-cases/update-sede.use-case';
import { DepartamentoModule } from '../departamento/departamento.module';

@Module({
  imports: [DatabaseModule, DepartamentoModule],
  controllers: [SedeController],
  providers: [
    { provide: SEDE_REPOSITORY, useClass: PrismaSedeRepository },
    CreateSedeUseCase,
    GetSedesUseCase,
    GetSedeByIdUseCase,
    UpdateSedeUseCase,
    DeleteSedeUseCase,
  ],
  exports: [GetSedesUseCase],
})
export class SedeModule { }
