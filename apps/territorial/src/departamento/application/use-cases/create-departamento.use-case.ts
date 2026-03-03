import { Injectable, Inject } from '@nestjs/common';
import { DEPARTAMENTO_REPOSITORY } from '../../domain/repositories/departamento.repository.interface';
import type { IDepartamentoRepository } from '../../domain/repositories/departamento.repository.interface';
import { Departamento } from '../../domain/entities/departamento.entity';

@Injectable()
export class CreateDepartamentoUseCase {
  constructor(
    @Inject(DEPARTAMENTO_REPOSITORY)
    private readonly repository: IDepartamentoRepository,
  ) {}

  async execute(data: any): Promise<Departamento> {
    return await this.repository.create({ ...data, estado: data.estado || 'activo' });
  }
}
