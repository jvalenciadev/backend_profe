import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { CARGO_REPOSITORY } from './domain/repositories/cargo.repository.interface';
import { PrismaCargoRepository } from './infrastructure/database/prisma-cargo.repository';
import { CargosController } from './infrastructure/controllers/cargos.controller';
import { CreateCargoUseCase } from './application/use-cases/create-cargo.use-case';
import {
  GetCargosUseCase,
  GetCargoByIdUseCase,
} from './application/use-cases/get-cargos.use-case';
import {
  UpdateCargoUseCase,
  DeleteCargoUseCase,
} from './application/use-cases/update-cargo.use-case';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [CargosController], // Nota: está expuesto en /cargos-clean
  providers: [
    // El puerto inyectable (La interfaz mapeada a la implementación de prisma)
    {
      provide: CARGO_REPOSITORY,
      useClass: PrismaCargoRepository,
    },
    // Casos de Uso
    CreateCargoUseCase,
    GetCargosUseCase,
    GetCargoByIdUseCase,
    UpdateCargoUseCase,
    DeleteCargoUseCase,
  ],
  exports: [GetCargosUseCase], // Podemos exportarlo si otro módulo lo necesita puramente
})
export class CargosModule {}
