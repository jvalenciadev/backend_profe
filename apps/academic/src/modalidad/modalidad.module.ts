import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { MODALIDAD_REPOSITORY } from './domain/repositories/modalidad.repository.interface';
import { PrismaModalidadRepository } from './infrastructure/database/prisma-modalidad.repository';
import { ModalidadController } from './infrastructure/controllers/modalidad.controller';
import {
  GetModalidadsUseCase, GetModalidadByIdUseCase, CreateModalidadUseCase, UpdateModalidadUseCase, DeleteModalidadUseCase
} from './application/use-cases/modalidad.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [ModalidadController],
  providers: [
    { provide: MODALIDAD_REPOSITORY, useClass: PrismaModalidadRepository },
    GetModalidadsUseCase,
    GetModalidadByIdUseCase,
    CreateModalidadUseCase,
    UpdateModalidadUseCase,
    DeleteModalidadUseCase,
  ],
  exports: [GetModalidadsUseCase, GetModalidadByIdUseCase]
})
export class ModalidadModule {}