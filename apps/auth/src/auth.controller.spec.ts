import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: 'PrismaService', // Use the token if it's a string or the class itself
          useValue: {},
        },
        {
          provide: 'JwtService',
          useValue: {},
        },
        {
          provide: 'CaslAbilityFactory',
          useValue: {},
        },
        {
          provide: 'MailService',
          useValue: {},
        },
      ],
    })
      .overrideProvider('PrismaService')
      .useValue({})
      .compile();

    authController = app.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });
});
