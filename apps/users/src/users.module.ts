import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BancoProfesionalModule } from './bancoProfesional/banco-profesional.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './roles-crud/roles-crud.module';
import { PermissionsCrudModule as PermissionModule } from './permissions-crud/permissions-crud.module';
import { ProfeModule } from './profe/profe.module';
import { CargosModule } from './cargos/cargos.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { CaslModule, MailModule, AuditInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from '@app/database';

// 🚀 Módulos con Clean Architecture Completa (Nuevos/Migrados)
// 🚀 Módulos con Clean Architecture Completa (Nuevos/Migrados)
import { AreaModule } from './areas-crud/areas-crud.module';
import { GeneroModule } from './generos-crud/generos-crud.module';
import { MapPersonasModule } from './map-personas/map-personas.module';

// Controllers y Casos de Uso del Usuario
import { UsersController } from './users.controller';
import {
  CreateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
  RequestEmailVerificationUseCase,
  ChangePasswordUseCase,
  BulkImportUsersUseCase,
} from './user/application/use-cases/user.use-cases';

import { CamposExtraController } from './campos-extra/campos-extra.controller';
import { CamposExtraService } from './campos-extra/campos-extra.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CaslModule,
    MailModule,

    // Core Modules
    UserModule,
    RoleModule,
    PermissionModule,
    ProfeModule,
    EvaluationsModule,
    BancoProfesionalModule,

    // HR and Support Modules
    CargosModule,
    AreaModule,
    GeneroModule,
    MapPersonasModule,
  ],
  controllers: [CamposExtraController, UsersController],
  providers: [
    // Re-exportar use cases del UserModule para el UsersController
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    ResetUserPasswordUseCase,
    RequestEmailVerificationUseCase,
    ChangePasswordUseCase,
    BulkImportUsersUseCase,
    CamposExtraService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class UsersModule {}
