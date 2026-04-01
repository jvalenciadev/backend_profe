import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { MapPersonasController } from './infrastructure/controllers/map-personas.controller';
import { FindMapPersonasUseCase } from './application/use-cases/find-map-personas.use-case';
import { ImportMapPersonasUseCase } from './application/use-cases/import-map-personas.use-case';
import { GetMapCatalogsUseCase } from './application/use-cases/get-map-catalogs.use-case';

@Module({
  imports: [DatabaseModule],
  controllers: [MapPersonasController],
  providers: [
    FindMapPersonasUseCase,
    ImportMapPersonasUseCase,
    GetMapCatalogsUseCase,
  ],
  exports: [FindMapPersonasUseCase],
})
export class MapPersonasModule {}
