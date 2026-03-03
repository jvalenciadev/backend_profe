import { Injectable, Inject } from '@nestjs/common';
import { DISTRITO_REPOSITORY, DistritoFilters } from '../../domain/repositories/distrito.repository.interface';
import type { IDistritoRepository } from '../../domain/repositories/distrito.repository.interface';
import { Distrito } from '../../domain/entities/distrito.entity';

@Injectable()
export class GetDistritosUseCase {
  constructor(
    @Inject(DISTRITO_REPOSITORY)
    private readonly repository: IDistritoRepository,
  ) {}

  async execute(filters: DistritoFilters = {}): Promise<{ data: Distrito[]; total: number }> {
    return await this.repository.findAll(filters);
  }
}

@Injectable()
export class GetDistritoByIdUseCase {
  constructor(
    @Inject(DISTRITO_REPOSITORY)
    private readonly repository: IDistritoRepository,
  ) {}

  async execute(id: string): Promise<Distrito> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new Error('Distrito no encontrado');
    return entity;
  }
}
