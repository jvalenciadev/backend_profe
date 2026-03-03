import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { PERMISSION_REPOSITORY } from './domain/repositories/permissions-crud.repository.interface';
import { PrismaPermissionRepository } from './infrastructure/database/prisma-permissions-crud.repository';
import { PermissionsCrudController } from './infrastructure/controllers/permissions-crud.controller';
import {
  GetPermissionsUseCase, GetPermissionByIdUseCase, CreatePermissionUseCase, UpdatePermissionUseCase, DeletePermissionUseCase
} from './application/use-cases/permissions-crud.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [PermissionsCrudController],
  providers: [
    { provide: PERMISSION_REPOSITORY, useClass: PrismaPermissionRepository },
    GetPermissionsUseCase,
    GetPermissionByIdUseCase,
    CreatePermissionUseCase,
    UpdatePermissionUseCase,
    DeletePermissionUseCase,
  ],
  exports: [GetPermissionsUseCase, GetPermissionByIdUseCase]
})
export class PermissionsCrudModule { }