import { Test, TestingModule } from '@nestjs/testing';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { AppConfigService } from './app-config/app-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('LmsController (Pruebas Unitarias)', () => {
  let controller: LmsController;
  let service: LmsService;

  const mockLmsService = {
    login: jest.fn(),
  };

  const mockAppConfigService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LmsController],
      providers: [
        { provide: LmsService, useValue: mockLmsService },
        { provide: AppConfigService, useValue: mockAppConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LmsController>(LmsController);
    service = module.get<LmsService>(LmsService);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('debería llamar a LmsService.login con los parámetros correctos', async () => {
      const loginDto = {
        username: 'juan.perez',
        password: 'password123',
        tokenDispositivo: 'token-mock',
      };
      const mockResult = { access_token: 'jwt-valido' };
      mockLmsService.login.mockResolvedValue(mockResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(
        'juan.perez',
        'password123',
        'token-mock',
      );
      expect(result).toBe(mockResult);
    });
  });
});
