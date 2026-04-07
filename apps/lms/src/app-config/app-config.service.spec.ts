import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './app-config.service';
import { PrismaService } from '@app/database';

describe('AppConfigService (Blindaje Configuración)', () => {
  let service: AppConfigService;

  const mockPrisma = {
    profe: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  describe('getAppInfo', () => {
    it('debe retornar info por defecto si no hay datos en BD', async () => {
      mockPrisma.profe.findFirst.mockResolvedValue(null);
      const result = await service.getAppInfo();

      expect(result.status).toBe('success');
      expect(result.respuesta.nombre).toBe('Programa PROFE');
      expect(result.respuesta.colors.primary).toBe('#c9a751');
    });

    it('debe priorizar datos de la BD sobre los defaults', async () => {
      mockPrisma.profe.findFirst.mockResolvedValue({
        nombre: 'Custom Profe',
        color: '#FF0000',
        mantenimiento: true,
      });
      const result = await service.getAppInfo();

      expect(result.respuesta.nombre).toBe('Custom Profe');
      expect(result.respuesta.colors.primary).toBe('#FF0000');
      expect(result.respuesta.estado_mantenimiento).toBe(true);
    });
  });

  describe('getVersionMobile', () => {
    it('debe retornar la versión actual', async () => {
      const result = await service.getVersionMobile();
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('url');
    });
  });
});
