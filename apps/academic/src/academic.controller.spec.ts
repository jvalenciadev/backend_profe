import { Test, TestingModule } from '@nestjs/testing';
import { AcademicController } from './academic.controller';
import { CreateAcademicVersionUseCase } from './oferta/application/use-cases/create-academic-version.use-case';
import { JwtAuthGuard } from '@app/common';

describe('AcademicController (Pruebas Unitarias)', () => {
  let controller: AcademicController;

  const mockCreateUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademicController],
      providers: [
        { provide: CreateAcademicVersionUseCase, useValue: mockCreateUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AcademicController>(AcademicController);
  });

  it('debería estar definido (AcademicController)', () => {
    expect(controller).toBeDefined();
  });
});
