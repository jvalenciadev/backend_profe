import { Injectable, Inject } from '@nestjs/common';
import { PROGRAMA_REPOSITORY, ProgramaFilters } from '../../domain/repositories/programa.repository.interface';
import type { IProgramaRepository } from '../../domain/repositories/programa.repository.interface';
import { Programa } from '../../domain/entities/programa.entity';

@Injectable()
export class GetProgramasUseCase {
  constructor(
    @Inject(PROGRAMA_REPOSITORY)
    private readonly repository: IProgramaRepository,
  ) {}

  async execute(filters: ProgramaFilters = {}): Promise<{ data: Programa[]; total: number }> {
    return await this.repository.findAll(filters);
  }
}

@Injectable()
export class GetProgramaByIdUseCase {
  constructor(
    @Inject(PROGRAMA_REPOSITORY)
    private readonly repository: IProgramaRepository,
  ) {}

  async execute(id: string): Promise<Programa> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new Error('Programa no encontrado');
    return entity;
  }
}
