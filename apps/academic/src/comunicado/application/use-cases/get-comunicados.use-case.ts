import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { COMUNICADO_REPOSITORY, ComunicadoFilters } from '../../domain/repositories/comunicado.repository.interface';
import type { IComunicadoRepository } from '../../domain/repositories/comunicado.repository.interface';
import { Comunicado } from '../../domain/entities/comunicado.entity';

@Injectable()
export class GetComunicadosUseCase {
  constructor(
    @Inject(COMUNICADO_REPOSITORY)
    private readonly repository: IComunicadoRepository,
  ) { }

  async execute(filters: ComunicadoFilters = {}, ability?: any): Promise<{ data: Comunicado[]; total: number }> {
    return await this.repository.findAll(filters, ability);
  }
}

@Injectable()
export class GetComunicadoByIdUseCase {
  constructor(
    @Inject(COMUNICADO_REPOSITORY)
    private readonly repository: IComunicadoRepository,
  ) { }

  async execute(id: string, ability?: any): Promise<Comunicado> {
    const entity = await this.repository.findById(id, ability);
    if (!entity) throw new NotFoundException(`Comunicado con ID ${id} no encontrado`);

    return entity;
  }
}
