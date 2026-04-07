import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '@app/database';

describe('AppController (Pruebas Unitarias Monolito)', () => {
  let appController: AppController;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('Salud del sistema', () => {
    it('debería retornar "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
