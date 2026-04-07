import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaService } from '@app/database';

describe('AuditController (Pruebas Unitarias)', () => {
  let controller: AuditController;

  const mockAuditService = {
    getLogs: jest.fn().mockResolvedValue([]),
    getVersions: jest.fn().mockResolvedValue([]),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: mockAuditService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('debería estar definido (AuditController)', () => {
    expect(controller).toBeDefined();
  });
});
