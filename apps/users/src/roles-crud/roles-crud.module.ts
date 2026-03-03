import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { ROLE_REPOSITORY } from './domain/repositories/roles-crud.repository.interface';
import { PrismaRoleRepository } from './infrastructure/database/prisma-roles-crud.repository';
import { RolesCrudController } from './infrastructure/controllers/roles-crud.controller';
import {
  GetRolesUseCase, GetRoleByIdUseCase, CreateRoleUseCase, UpdateRoleUseCase, DeleteRoleUseCase
} from './application/use-cases/roles-crud.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [RolesCrudController],
  providers: [
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    GetRolesUseCase,
    GetRoleByIdUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
  ],
  exports: [GetRolesUseCase, GetRoleByIdUseCase]
})
export class RoleModule { }