import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '@app/database';
import { JwtService } from '@nestjs/jwt';
import { CaslAbilityFactory, MailService } from '@app/common';

describe('AuthController (Pruebas Unitarias)', () => {
  let controller: AuthController;

  // Definimos mocks mínimos para que Nest pueda instanciar los servicios
  const mockPrismaService = {};
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const mockAbilityFactory = {
    createForUser: jest.fn(),
  };
  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CaslAbilityFactory, useValue: mockAbilityFactory },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debería estar definido (AuthController)', () => {
    expect(controller).toBeDefined();
  });
});
