import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { AREA_REPOSITORY } from './domain/repositories/areas-crud.repository.interface';
import { PrismaAreaRepository } from './infrastructure/database/prisma-areas-crud.repository';
import { AreaController } from './infrastructure/controllers/areas-crud.controller';
import {
  GetAreasUseCase, GetAreaByIdUseCase, CreateAreaUseCase, UpdateAreaUseCase, DeleteAreaUseCase
} from './application/use-cases/areas-crud.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [AreaController],
  providers: [
    { provide: AREA_REPOSITORY, useClass: PrismaAreaRepository },
    GetAreasUseCase,
    GetAreaByIdUseCase,
    CreateAreaUseCase,
    UpdateAreaUseCase,
    DeleteAreaUseCase,
  ],
  exports: [GetAreasUseCase, GetAreaByIdUseCase]
})
export class AreaModule {}