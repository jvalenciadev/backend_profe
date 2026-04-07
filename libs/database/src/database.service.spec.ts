import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './database.service';

describe('PrismaService (Librería de Base de Datos)', () => {
  let service: PrismaService;

  beforeEach(async () => {
    // Para el test unitario de la base de datos, usamos un mock simple
    // para evitar que intente conectar al servidor real de DB.
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('debería estar definido (PrismaService)', () => {
    expect(service).toBeDefined();
  });
});
