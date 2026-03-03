import { Module } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { InscripcionController } from './infrastructure/controllers/inscripcion.controller';
import { PrismaInscripcionRepository } from './infrastructure/database/prisma-inscripcion.repository';
import { CreateInscripcionUseCase } from './application/use-cases/create-inscripcion.use-case';
import { OfertaModule } from '../oferta/oferta.module';
import { INSCRIPCION_REPOSITORY } from './domain/repositories/inscripcion.repository.interface';

@Module({
    imports: [OfertaModule],
    controllers: [InscripcionController],
    providers: [
        PrismaService,
        CreateInscripcionUseCase,
        {
            provide: INSCRIPCION_REPOSITORY,
            useClass: PrismaInscripcionRepository,
        },
    ],
})
export class InscripcionModule { }
