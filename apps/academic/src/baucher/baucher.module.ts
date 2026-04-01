import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { BAUCHER_REPOSITORY } from './domain/repositories/baucher.repository.interface';
import { PrismaBaucherRepository } from './infrastructure/database/prisma-baucher.repository';
import { BaucherController } from './infrastructure/controllers/baucher.controller';
import {
  GetBauchersUseCase,
  GetBaucherByIdUseCase,
  CreateBaucherUseCase,
  UpdateBaucherUseCase,
  DeleteBaucherUseCase,
} from './application/use-cases/baucher.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [BaucherController],
  providers: [
    { provide: BAUCHER_REPOSITORY, useClass: PrismaBaucherRepository },
    GetBauchersUseCase,
    GetBaucherByIdUseCase,
    CreateBaucherUseCase,
    UpdateBaucherUseCase,
    DeleteBaucherUseCase,
  ],
  exports: [GetBauchersUseCase, GetBaucherByIdUseCase],
})
export class BaucherModule {}
