import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { PrismaOfertaRepository } from './infrastructure/database/prisma-oferta.repository';
import { OFERTA_REPOSITORY } from './domain/repositories/oferta.repository.interface';
import { GetOfertasUseCase, GetOfertaByIdUseCase } from './application/use-cases/get-ofertas.use-case';
import { CreateAcademicVersionUseCase } from './application/use-cases/create-academic-version.use-case';
import { OfertaController } from './infrastructure/controllers/oferta.controller';

@Module({
    imports: [DatabaseModule, CaslModule],
    controllers: [OfertaController],
    providers: [
        GetOfertasUseCase,
        GetOfertaByIdUseCase,
        CreateAcademicVersionUseCase,
        {
            provide: OFERTA_REPOSITORY,
            useClass: PrismaOfertaRepository,
        },
    ],
    exports: [OFERTA_REPOSITORY, GetOfertasUseCase, GetOfertaByIdUseCase, CreateAcademicVersionUseCase],
})
export class OfertaModule { }
