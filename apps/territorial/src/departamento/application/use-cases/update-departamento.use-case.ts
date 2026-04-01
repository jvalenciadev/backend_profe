import { Injectable, Inject } from '@nestjs/common';
import { DEPARTAMENTO_REPOSITORY } from '../../domain/repositories/departamento.repository.interface';
import type { IDepartamentoRepository } from '../../domain/repositories/departamento.repository.interface';
import { Departamento } from '../../domain/entities/departamento.entity';

@Injectable()
export class UpdateDepartamentoUseCase {
  constructor(
    @Inject(DEPARTAMENTO_REPOSITORY)
    private readonly repository: IDepartamentoRepository,
  ) {}

  async execute(
    id: string,
    data: Partial<Departamento>,
  ): Promise<Departamento> {
    return await this.repository.update(id, data);
  }
}

@Injectable()
export class DeleteDepartamentoUseCase {
  constructor(
    @Inject(DEPARTAMENTO_REPOSITORY)
    private readonly repository: IDepartamentoRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }
}
