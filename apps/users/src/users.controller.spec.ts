import { Test, TestingModule } from '@nestjs/testing';
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
} from './user/application/use-cases/user.use-cases';
import { JwtAuthGuard, PoliciesGuard } from '@app/common';

describe('UsersController (Pruebas Unitarias)', () => {
  let controller: UsersController;

  // Mock de todos los casos de uso
  const mockUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: CreateUserUseCase, useValue: mockUseCase },
        { provide: FindAllUsersUseCase, useValue: mockUseCase },
        { provide: FindUserByIdUseCase, useValue: mockUseCase },
        { provide: UpdateUserUseCase, useValue: mockUseCase },
        { provide: DeleteUserUseCase, useValue: mockUseCase },
        { provide: ResetUserPasswordUseCase, useValue: mockUseCase },
        { provide: RequestEmailVerificationUseCase, useValue: mockUseCase },
        { provide: ChangePasswordUseCase, useValue: mockUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('debería estar definido (UsersController)', () => {
    expect(controller).toBeDefined();
  });
});
