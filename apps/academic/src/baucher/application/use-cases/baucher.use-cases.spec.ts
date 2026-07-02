import { Test, TestingModule } from '@nestjs/testing';
import {
  GetBauchersUseCase,
  GetBaucherByIdUseCase,
  CreateBaucherUseCase,
  UpdateBaucherUseCase,
  DeleteBaucherUseCase,
} from './baucher.use-cases';
import { BAUCHER_REPOSITORY } from '../../domain/repositories/baucher.repository.interface';
import { NotFoundException } from '@nestjs/common';

describe('Baucher Use Cases (Blindaje Clean Architecture)', () => {
  const mockRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  let getMany: GetBauchersUseCase;
  let getOne: GetBaucherByIdUseCase;
  let create: CreateBaucherUseCase;
  let update: UpdateBaucherUseCase;
  let del: DeleteBaucherUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBauchersUseCase,
        GetBaucherByIdUseCase,
        CreateBaucherUseCase,
        UpdateBaucherUseCase,
        DeleteBaucherUseCase,
        { provide: BAUCHER_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    getMany = module.get(GetBauchersUseCase);
    getOne = module.get(GetBaucherByIdUseCase);
    create = module.get(CreateBaucherUseCase);
    update = module.get(UpdateBaucherUseCase);
    del = module.get(DeleteBaucherUseCase);

    jest.clearAllMocks();
  });

  it('debe listar bauchers llamando al repo', async () => {
    mockRepo.findAll.mockResolvedValue([]);
    await getMany.execute();
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('debe crear baucher con los parámetros de usuario y tenant', async () => {
    const data = { monto: 100 };
    await create.execute(data, 'u1', 't1');
    expect(mockRepo.create).toHaveBeenCalledWith(data, 'u1', 't1');
  });

  it('debe eliminar baucher y retornar mensaje', async () => {
    const res = await del.execute('id1');
    expect(res.message).toBe('Eliminado correctamente');
    expect(mockRepo.delete).toHaveBeenCalledWith('id1', undefined, undefined);
  });

  it('debe lanzar NotFoundException si findById retorna nulo', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(getOne.execute('none')).rejects.toThrow(NotFoundException);
  });
});
