import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { VERSION_REPOSITORY } from './domain/repositories/version.repository.interface';
import { PrismaVersionRepository } from './infrastructure/database/prisma-version.repository';
import { VersionController } from './infrastructure/controllers/version.controller';
import {
  GetVersionsUseCase, GetVersionByIdUseCase, CreateVersionUseCase, UpdateVersionUseCase, DeleteVersionUseCase
} from './application/use-cases/version.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [VersionController],
  providers: [
    { provide: VERSION_REPOSITORY, useClass: PrismaVersionRepository },
    GetVersionsUseCase,
    GetVersionByIdUseCase,
    CreateVersionUseCase,
    UpdateVersionUseCase,
    DeleteVersionUseCase,
  ],
  exports: [GetVersionsUseCase, GetVersionByIdUseCase]
})
export class VersionModule {}