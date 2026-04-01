import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PROFE_REPOSITORY,
  ProfeFilters,
} from '../../domain/repositories/profe.repository.interface';
import type { IProfeRepository } from '../../domain/repositories/profe.repository.interface';
import { Profe } from '../../domain/entities/profe.entity';

@Injectable()
export class GetProfesUseCase {
  constructor(
    @Inject(PROFE_REPOSITORY)
    private readonly repository: IProfeRepository,
  ) {}

  async execute(
    filters: ProfeFilters = {},
  ): Promise<{ data: Profe[]; total: number }> {
    return await this.repository.findAll(filters);
  }
}

@Injectable()
export class GetProfeByIdUseCase {
  constructor(
    @Inject(PROFE_REPOSITORY)
    private readonly repository: IProfeRepository,
  ) {}

  async execute(id: string): Promise<Profe> {
    const entity = await this.repository.findById(id);
    if (!entity)
      throw new NotFoundException(
        `Configuración institucional con ID ${id} no encontrada`,
      );
    return entity;
  }
}
