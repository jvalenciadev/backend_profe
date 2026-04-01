import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule, MailModule } from '@app/common';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { PrismaUserRepository } from './infrastructure/database/prisma-user.repository';
import {
  CreateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
  RequestEmailVerificationUseCase,
} from './application/use-cases/user.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule, MailModule],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    ResetUserPasswordUseCase,
    RequestEmailVerificationUseCase,
  ],
  exports: [
    USER_REPOSITORY,
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    ResetUserPasswordUseCase,
    RequestEmailVerificationUseCase,
  ],
})
export class UserModule {}
