import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { TIPO_REPOSITORY } from './domain/repositories/tipo.repository.interface';
import { PrismaTipoRepository } from './infrastructure/database/prisma-tipo.repository';
import { TipoController } from './infrastructure/controllers/tipo.controller';
import {
  GetTiposUseCase,
  GetTipoByIdUseCase,
  CreateTipoUseCase,
  UpdateTipoUseCase,
  DeleteTipoUseCase,
} from './application/use-cases/tipo.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [TipoController],
  providers: [
    { provide: TIPO_REPOSITORY, useClass: PrismaTipoRepository },
    GetTiposUseCase,
    GetTipoByIdUseCase,
    CreateTipoUseCase,
    UpdateTipoUseCase,
    DeleteTipoUseCase,
  ],
  exports: [GetTiposUseCase, GetTipoByIdUseCase],
})
export class TipoModule {}
