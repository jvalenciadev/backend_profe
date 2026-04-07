import { Test, TestingModule } from '@nestjs/testing';
import { 
  GetAsignacionFacilitadorsUseCase, 
  GetAsignacionFacilitadorByIdUseCase, 
  CreateAsignacionFacilitadorUseCase, 
  UpdateAsignacionFacilitadorUseCase, 
  DeleteAsignacionFacilitadorUseCase 
} from './asignacion-facilitador.use-cases';
import { ASIGNACIONFACILITADOR_REPOSITORY } from '../../domain/repositories/asignacion-facilitador.repository.interface';
import { NotFoundException } from '@nestjs/common';

describe('AsignacionFacilitador Use Cases (Blindaje Clean Architecture)', () => {
  const mockRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  let getMany: GetAsignacionFacilitadorsUseCase;
  let getOne: GetAsignacionFacilitadorByIdUseCase;
  let create: CreateAsignacionFacilitadorUseCase;
  let update: UpdateAsignacionFacilitadorUseCase;
  let del: DeleteAsignacionFacilitadorUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAsignacionFacilitadorsUseCase,
        GetAsignacionFacilitadorByIdUseCase,
        CreateAsignacionFacilitadorUseCase,
        UpdateAsignacionFacilitadorUseCase,
        DeleteAsignacionFacilitadorUseCase,
        { provide: ASIGNACIONFACILITADOR_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    getMany = module.get(GetAsignacionFacilitadorsUseCase);
    getOne = module.get(GetAsignacionFacilitadorByIdUseCase);
    create = module.get(CreateAsignacionFacilitadorUseCase);
    update = module.get(UpdateAsignacionFacilitadorUseCase);
    del = module.get(DeleteAsignacionFacilitadorUseCase);
    
    jest.clearAllMocks();
  });

  it('debe listar todas las asignaciones', async () => {
    mockRepo.findAll.mockResolvedValue([]);
    const res = await getMany.execute();
    expect(res).toEqual([]);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('debe lanzar NotFoundException en getById si no existe', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(getOne.execute('none')).rejects.toThrow(NotFoundException);
  });

  it('debe crear una asignación llamando al repositorio', async () => {
    const data = { facilitadorId: 'f1', moduloId: 'm1' };
    await create.execute(data, 'admin', 'tenant');
    expect(mockRepo.create).toHaveBeenCalledWith(data, 'admin', 'tenant');
  });

  it('debe borrar una asignación y retornar mensaje de éxito', async () => {
    const res = await del.execute('id1', 'admin');
    expect(res.message).toContain('correctamente');
    expect(mockRepo.delete).toHaveBeenCalledWith('id1', 'admin', undefined);
  });
});
