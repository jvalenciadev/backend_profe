import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BancoProfesionalModule } from './bancoProfesional/banco-profesional.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './roles-crud/roles-crud.module';
import { PermissionsCrudModule as PermissionModule } from './permissions-crud/permissions-crud.module';
import { ProfeModule } from './profe/profe.module';
import { CargosModule } from './cargos/cargos.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { CaslModule, MailModule } from '@app/common';
import { DatabaseModule } from '@app/database';

// 🚀 Módulos con Clean Architecture Completa (Nuevos/Migrados)
// 🚀 Módulos con Clean Architecture Completa (Nuevos/Migrados)
import { AreaModule } from './areas-crud/areas-crud.module';
import { GeneroModule } from './generos-crud/generos-crud.module';
import { MapPersonasModule } from './map-personas/map-personas.module';


// Controllers y Casos de Uso del Usuario
import { UsersController } from './users.controller';
import {
  CreateUserUseCase, FindAllUsersUseCase, FindUserByIdUseCase,
  UpdateUserUseCase, DeleteUserUseCase, ResetUserPasswordUseCase,
  RequestEmailVerificationUseCase,
} from './user/application/use-cases/user.use-cases';

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
  controllers: [
    UsersController,
  ],
  providers: [
    // Re-exportar use cases del UserModule para el UsersController
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    ResetUserPasswordUseCase,
    RequestEmailVerificationUseCase,
  ],
})
export class UsersModule { }
