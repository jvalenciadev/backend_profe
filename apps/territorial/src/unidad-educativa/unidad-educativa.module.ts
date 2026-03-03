import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { UNIDAD_EDUCATIVA_REPOSITORY } from './domain/repositories/unidad-educativa.repository.interface';
import { PrismaUnidadEducativaRepository } from './infrastructure/database/prisma-unidad-educativa.repository';
import { UnidadEducativaController } from './infrastructure/controllers/unidad-educativa.controller';
import { GetUnidadesEducativasUseCase, GetUnidadEducativaByIdUseCase } from './application/use-cases/get-unidades-educativas.use-case';
import { CreateUnidadEducativaUseCase, UpdateUnidadEducativaUseCase, DeleteUnidadEducativaUseCase } from './application/use-cases/crud-unidad-educativa.use-case';

@Module({
    imports: [DatabaseModule],
    controllers: [UnidadEducativaController],
    providers: [
        { provide: UNIDAD_EDUCATIVA_REPOSITORY, useClass: PrismaUnidadEducativaRepository },
        GetUnidadesEducativasUseCase,
        GetUnidadEducativaByIdUseCase,
        CreateUnidadEducativaUseCase,
        UpdateUnidadEducativaUseCase,
        DeleteUnidadEducativaUseCase,
    ],
    exports: [GetUnidadesEducativasUseCase],
})
export class UnidadEducativaModule { }
