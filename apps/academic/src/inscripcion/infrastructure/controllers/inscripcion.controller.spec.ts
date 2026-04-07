import { Test, TestingModule } from '@nestjs/testing';
import { InscripcionController } from './inscripcion.controller';
import { CreateInscripcionUseCase } from '../../application/use-cases/create-inscripcion.use-case';
import { GetInscripcionsUseCase } from '../../application/use-cases/get-inscripcions.use-case';
import { GetInscripcionByIdUseCase } from '../../application/use-cases/get-inscripcion-by-id.use-case';
import { UpdateInscripcionUseCase } from '../../application/use-cases/update-inscripcion.use-case';
import { DeleteInscripcionUseCase } from '../../application/use-cases/delete-inscripcion.use-case';
import { ConfirmBaucherUseCase } from '../../application/use-cases/confirm-baucher.use-case';
import { ConfirmInscripcionUseCase } from '../../application/use-cases/confirm-inscripcion.use-case';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

describe('InscripcionController (Unit Tests)', () => {
  let controller: InscripcionController;

  const mockUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InscripcionController],
      providers: [
        { provide: CreateInscripcionUseCase, useValue: mockUseCase },
        { provide: GetInscripcionsUseCase, useValue: mockUseCase },
        { provide: GetInscripcionByIdUseCase, useValue: mockUseCase },
        { provide: UpdateInscripcionUseCase, useValue: mockUseCase },
        { provide: DeleteInscripcionUseCase, useValue: mockUseCase },
        { provide: ConfirmBaucherUseCase, useValue: mockUseCase },
        { provide: ConfirmInscripcionUseCase, useValue: mockUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InscripcionController>(InscripcionController);
  });

  it('debe llamar a CreateInscripcionUseCase.execute', async () => {
    const dto = { programaId: 'p1' } as any;
    const req = { user: { id: 'admin' } };
    await controller.create(dto, req);
    expect(mockUseCase.execute).toHaveBeenCalledWith(dto, 'admin');
  });

  it('debe llamar a GetInscripcionsUseCase.execute', async () => {
    await controller.findAll({ search: 'abc' });
    expect(mockUseCase.execute).toHaveBeenCalledWith({ search: 'abc' });
  });

  it('debe llamar a ConfirmBaucherUseCase.execute', async () => {
    const req = { user: { id: 'admin' } };
    await controller.confirmBaucher('b1', { confirmed: true }, req);
    expect(mockUseCase.execute).toHaveBeenCalledWith('b1', true, 'admin');
  });
});
