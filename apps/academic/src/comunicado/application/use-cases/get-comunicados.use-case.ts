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

  async execute(filters: ComunicadoFilters = {}, tenantId?: string): Promise<{ data: Comunicado[]; total: number }> {
    // Si hay tenantId forzamos el filtro al tenant del usuario actual
    const appliedFilters = { ...filters };
    if (tenantId) {
      appliedFilters.tenantId = tenantId;
    }
    return await this.repository.findAll(appliedFilters);
  }
}

@Injectable()
export class GetComunicadoByIdUseCase {
  constructor(
    @Inject(COMUNICADO_REPOSITORY)
    private readonly repository: IComunicadoRepository,
  ) { }

  async execute(id: string, tenantId?: string): Promise<Comunicado> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundException(`Comunicado con ID ${id} no encontrado`);

    if (tenantId && entity.tenantId && entity.tenantId !== tenantId) {
      throw new NotFoundException(`Comunicado con ID ${id} no encontrado en este departamento`);
    }

    return entity;
  }
}
