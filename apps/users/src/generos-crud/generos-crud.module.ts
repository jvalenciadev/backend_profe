import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { GENERO_REPOSITORY } from './domain/repositories/generos-crud.repository.interface';
import { PrismaGeneroRepository } from './infrastructure/database/prisma-generos-crud.repository';
import { GeneroController } from './infrastructure/controllers/generos-crud.controller';
import {
  GetGenerosUseCase,
  GetGeneroByIdUseCase,
  CreateGeneroUseCase,
  UpdateGeneroUseCase,
  DeleteGeneroUseCase,
} from './application/use-cases/generos-crud.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [GeneroController],
  providers: [
    { provide: GENERO_REPOSITORY, useClass: PrismaGeneroRepository },
    GetGenerosUseCase,
    GetGeneroByIdUseCase,
    CreateGeneroUseCase,
    UpdateGeneroUseCase,
    DeleteGeneroUseCase,
  ],
  exports: [GetGenerosUseCase, GetGeneroByIdUseCase],
})
export class GeneroModule {}
