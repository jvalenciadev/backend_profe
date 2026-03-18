import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule, MailModule } from '@app/common';
import { COMUNICADO_REPOSITORY } from './domain/repositories/comunicado.repository.interface';
import { PrismaComunicadoRepository } from './infrastructure/database/prisma-comunicado.repository';
import { ComunicadoController } from './infrastructure/controllers/comunicado.controller';
import { CreateComunicadoUseCase } from './application/use-cases/create-comunicado.use-case';
import { GetComunicadosUseCase, GetComunicadoByIdUseCase } from './application/use-cases/get-comunicados.use-case';
import { UpdateComunicadoUseCase, DeleteComunicadoUseCase } from './application/use-cases/update-comunicado.use-case';

@Module({
  imports: [DatabaseModule, CaslModule, MailModule],
  controllers: [ComunicadoController],
  providers: [
    { provide: COMUNICADO_REPOSITORY, useClass: PrismaComunicadoRepository },
    CreateComunicadoUseCase,
    GetComunicadosUseCase,
    GetComunicadoByIdUseCase,
    UpdateComunicadoUseCase,
    DeleteComunicadoUseCase,
  ],
  exports: [GetComunicadosUseCase],
})
export class ComunicadoModule { }
