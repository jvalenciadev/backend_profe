import { Injectable, Inject } from '@nestjs/common';
import {
  DEPARTAMENTO_REPOSITORY,
  DepartamentoFilters,
} from '../../domain/repositories/departamento.repository.interface';
import type { IDepartamentoRepository } from '../../domain/repositories/departamento.repository.interface';
import { Departamento } from '../../domain/entities/departamento.entity';

@Injectable()
export class GetDepartamentosUseCase {
  constructor(
    @Inject(DEPARTAMENTO_REPOSITORY)
    private readonly repository: IDepartamentoRepository,
  ) {}

  async execute(
    filters: DepartamentoFilters = {},
  ): Promise<{ data: Departamento[]; total: number }> {
    return await this.repository.findAll(filters);
  }
}

@Injectable()
export class GetDepartamentoByIdUseCase {
  constructor(
    @Inject(DEPARTAMENTO_REPOSITORY)
    private readonly repository: IDepartamentoRepository,
  ) {}

  async execute(id: string): Promise<Departamento> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new Error('Departamento no encontrado');
    return entity;
  }
}
