import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { GALERIA_REPOSITORY } from './domain/repositories/galeria.repository.interface';
import { PrismaGaleriaRepository } from './infrastructure/database/prisma-galeria.repository';
import { GaleriaController } from './infrastructure/controllers/galeria.controller';
import {
  GetGaleriasUseCase, GetGaleriaByIdUseCase, CreateGaleriaUseCase, UpdateGaleriaUseCase, DeleteGaleriaUseCase
} from './application/use-cases/galeria.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [GaleriaController],
  providers: [
    { provide: GALERIA_REPOSITORY, useClass: PrismaGaleriaRepository },
    GetGaleriasUseCase,
    GetGaleriaByIdUseCase,
    CreateGaleriaUseCase,
    UpdateGaleriaUseCase,
    DeleteGaleriaUseCase,
  ],
  exports: [GetGaleriasUseCase]
})
export class GaleriaModule {}