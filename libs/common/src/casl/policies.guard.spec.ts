import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesGuard } from './policies.guard';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from './casl-ability.factory';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('PoliciesGuard (Fase 2: Seguridad Global)', () => {
  let guard: PoliciesGuard;
  let reflector: Reflector;
  let caslAbilityFactory: CaslAbilityFactory;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
    get: jest.fn(),
  };

  const mockCaslAbilityFactory = {
    createForUser: jest.fn(),
  };

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnThis(),
    getRequest: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: CaslAbilityFactory, useValue: mockCaslAbilityFactory },
      ],
    }).compile();

    guard = module.get<PoliciesGuard>(PoliciesGuard);
    reflector = module.get<Reflector>(Reflector);
    caslAbilityFactory = module.get<CaslAbilityFactory>(CaslAbilityFactory);
  });

  it('debería permitir acceso si la ruta es @Public()', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true); // isPublic = true
    const request = {};
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(request);

    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });

  it('debería denegar acceso si no hay usuario en el request y no es pública', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const request = { user: null };
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(request);

    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(false);
  });

  it('debería lanzar ForbiddenException si el usuario no tiene permisos (CASL)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockReflector.get.mockReturnValue([(ability: any) => false]); // Handler que deniega

    const request = { user: { id: 'user_1' } };
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(request);
    mockCaslAbilityFactory.createForUser.mockResolvedValue({ rules: [] });

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debería permitir el paso y adjuntar "ability" al request si todo es correcto', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockReflector.get.mockReturnValue([(ability: any) => true]); // Handler que permite

    const request: any = { user: { id: 'user_1' } };
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(request);
    const mockAbility = { rules: [{ action: 'manage', subject: 'all' }] };
    mockCaslAbilityFactory.createForUser.mockResolvedValue(mockAbility);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(request.ability).toBe(mockAbility); // Verificamos inyección
  });
});
