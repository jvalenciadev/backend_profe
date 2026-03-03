import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { PROVINCIA_REPOSITORY } from './domain/repositories/provincia.repository.interface';
import { PrismaProvinciaRepository } from './infrastructure/database/prisma-provincia.repository';
import { ProvinciaController } from './infrastructure/controllers/provincia.controller';
import {
  GetProvinciasUseCase, GetProvinciaByIdUseCase, CreateProvinciaUseCase, UpdateProvinciaUseCase, DeleteProvinciaUseCase
} from './application/use-cases/provincia.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [ProvinciaController],
  providers: [
    { provide: PROVINCIA_REPOSITORY, useClass: PrismaProvinciaRepository },
    GetProvinciasUseCase,
    GetProvinciaByIdUseCase,
    CreateProvinciaUseCase,
    UpdateProvinciaUseCase,
    DeleteProvinciaUseCase,
  ],
  exports: [GetProvinciasUseCase]
})
export class ProvinciaModule {}