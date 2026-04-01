import { Injectable, Inject } from '@nestjs/common';
import {
  SEDE_REPOSITORY,
  SedeFilters,
} from '../../domain/repositories/sede.repository.interface';
import type { ISedeRepository } from '../../domain/repositories/sede.repository.interface';
import { Sede } from '../../domain/entities/sede.entity';

@Injectable()
export class GetSedesUseCase {
  constructor(
    @Inject(SEDE_REPOSITORY)
    private readonly repository: ISedeRepository,
  ) {}

  async execute(
    filters: SedeFilters = {},
    ability?: any,
  ): Promise<{ data: Sede[]; total: number }> {
    return await this.repository.findAll(filters, ability);
  }
}

@Injectable()
export class GetSedeByIdUseCase {
  constructor(
    @Inject(SEDE_REPOSITORY)
    private readonly repository: ISedeRepository,
  ) {}

  async execute(id: string, ability?: any): Promise<Sede> {
    const entity = await this.repository.findById(id, ability);
    if (!entity) throw new Error('Sede no encontrado');
    return entity;
  }
}
