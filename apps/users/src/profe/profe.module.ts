import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { PROFE_REPOSITORY } from './domain/repositories/profe.repository.interface';
import { PrismaProfeRepository } from './infrastructure/database/prisma-profe.repository';
import { ProfeController } from './infrastructure/controllers/profe.controller';
import { CreateProfeUseCase } from './application/use-cases/create-profe.use-case';
import { GetProfesUseCase, GetProfeByIdUseCase } from './application/use-cases/get-profes.use-case';
import { UpdateProfeUseCase, DeleteProfeUseCase } from './application/use-cases/update-profe.use-case';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfeController],
  providers: [
    { provide: PROFE_REPOSITORY, useClass: PrismaProfeRepository },
    CreateProfeUseCase,
    GetProfesUseCase,
    GetProfeByIdUseCase,
    UpdateProfeUseCase,
    DeleteProfeUseCase,
  ],
  exports: [GetProfesUseCase],
})
export class ProfeModule {}
