import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { DISTRITO_REPOSITORY } from './domain/repositories/distrito.repository.interface';
import { PrismaDistritoRepository } from './infrastructure/database/prisma-distrito.repository';
import { DistritoController } from './infrastructure/controllers/distrito.controller';
import { CreateDistritoUseCase } from './application/use-cases/create-distrito.use-case';
import {
  GetDistritosUseCase,
  GetDistritoByIdUseCase,
} from './application/use-cases/get-distritos.use-case';
import {
  UpdateDistritoUseCase,
  DeleteDistritoUseCase,
} from './application/use-cases/update-distrito.use-case';

@Module({
  imports: [DatabaseModule],
  controllers: [DistritoController],
  providers: [
    { provide: DISTRITO_REPOSITORY, useClass: PrismaDistritoRepository },
    CreateDistritoUseCase,
    GetDistritosUseCase,
    GetDistritoByIdUseCase,
    UpdateDistritoUseCase,
    DeleteDistritoUseCase,
  ],
  exports: [GetDistritosUseCase],
})
export class DistritoModule {}
