import { Module } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { BancoProfesionalController } from './infrastructure/controllers/banco-profesional.controller';
import { PublicBancoProfesionalController } from './infrastructure/controllers/public-banco-profesional.controller';
import { PrismaBancoProfesionalRepository } from './infrastructure/database/prisma-banco-profesional.repository';
import { BANCO_PROFESIONAL_REPOSITORY } from './domain/repositories/banco-profesional.repository.interface';
import { GetMyProfileUseCase } from './application/use-cases/get-my-profile.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { ManagePosgradoUseCase, ManageProduccionUseCase } from './application/use-cases/manage-experience.use-case';
import { RegistrationUseCase } from './application/use-cases/registration.use-case';
import { RequestVerificationUseCase } from './application/use-cases/request-verification.use-case';
import { LookupsUseCase } from './application/use-cases/lookups.use-case';
import { FindAllProfilesUseCase } from './application/use-cases/find-all-profiles.use-case';
import { ApproveProfessionalUseCase } from './application/use-cases/approve-professional.use-case';

import { MailModule } from '@app/common';

@Module({
    imports: [MailModule],
    controllers: [BancoProfesionalController, PublicBancoProfesionalController],
    providers: [
        PrismaService,
        GetMyProfileUseCase,
        UpdateProfileUseCase,
        ManagePosgradoUseCase,
        ManageProduccionUseCase,
        RegistrationUseCase,
        RequestVerificationUseCase,
        LookupsUseCase,
        FindAllProfilesUseCase,
        ApproveProfessionalUseCase,
        {
            provide: BANCO_PROFESIONAL_REPOSITORY,
            useClass: PrismaBancoProfesionalRepository,
        },
    ],
    exports: [BANCO_PROFESIONAL_REPOSITORY, GetMyProfileUseCase, UpdateProfileUseCase],
})
export class BancoProfesionalModule { }
