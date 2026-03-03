import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { DEPARTAMENTO_REPOSITORY } from './domain/repositories/departamento.repository.interface';
import { PrismaDepartamentoRepository } from './infrastructure/database/prisma-departamento.repository';
import { DepartamentoController } from './infrastructure/controllers/departamento.controller';
import { CreateDepartamentoUseCase } from './application/use-cases/create-departamento.use-case';
import { GetDepartamentosUseCase, GetDepartamentoByIdUseCase } from './application/use-cases/get-departamentos.use-case';
import { UpdateDepartamentoUseCase, DeleteDepartamentoUseCase } from './application/use-cases/update-departamento.use-case';

@Module({
  imports: [DatabaseModule],
  controllers: [DepartamentoController],
  providers: [
    { provide: DEPARTAMENTO_REPOSITORY, useClass: PrismaDepartamentoRepository },
    CreateDepartamentoUseCase,
    GetDepartamentosUseCase,
    GetDepartamentoByIdUseCase,
    UpdateDepartamentoUseCase,
    DeleteDepartamentoUseCase,
  ],
  exports: [GetDepartamentosUseCase, DEPARTAMENTO_REPOSITORY],
})
export class DepartamentoModule { }
