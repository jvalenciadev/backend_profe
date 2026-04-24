import { Module } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { InscripcionController } from './infrastructure/controllers/inscripcion.controller';
import { PrismaInscripcionRepository } from './infrastructure/database/prisma-inscripcion.repository';
import { CreateInscripcionUseCase } from './application/use-cases/create-inscripcion.use-case';
import { GetInscripcionsUseCase } from './application/use-cases/get-inscripcions.use-case';
import { GetInscripcionByIdUseCase } from './application/use-cases/get-inscripcion-by-id.use-case';
import { UpdateInscripcionUseCase } from './application/use-cases/update-inscripcion.use-case';
import { DeleteInscripcionUseCase } from './application/use-cases/delete-inscripcion.use-case';
import { ConfirmBaucherUseCase } from './application/use-cases/confirm-baucher.use-case';
import { ConfirmInscripcionUseCase } from './application/use-cases/confirm-inscripcion.use-case';
import { BulkImportInscripcionUseCase } from './application/use-cases/bulk-import-inscripcion.use-case';
import { OfertaModule } from '../oferta/oferta.module';
import { INSCRIPCION_REPOSITORY } from './domain/repositories/inscripcion.repository.interface';

@Module({
  imports: [OfertaModule],
  controllers: [InscripcionController],
  providers: [
    PrismaService,
    CreateInscripcionUseCase,
    GetInscripcionsUseCase,
    GetInscripcionByIdUseCase,
    UpdateInscripcionUseCase,
    DeleteInscripcionUseCase,
    ConfirmBaucherUseCase,
    ConfirmInscripcionUseCase,
    BulkImportInscripcionUseCase,
    {
      provide: INSCRIPCION_REPOSITORY,
      useClass: PrismaInscripcionRepository,
    },
  ],
})
export class InscripcionModule {}
