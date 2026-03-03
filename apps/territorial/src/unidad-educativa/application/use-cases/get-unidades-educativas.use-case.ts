import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UNIDAD_EDUCATIVA_REPOSITORY, UnidadEducativaFilters } from '../../domain/repositories/unidad-educativa.repository.interface';
import type { IUnidadEducativaRepository } from '../../domain/repositories/unidad-educativa.repository.interface';

@Injectable()
export class GetUnidadesEducativasUseCase {
    constructor(
        @Inject(UNIDAD_EDUCATIVA_REPOSITORY)
        private readonly repository: IUnidadEducativaRepository,
    ) { }

    async execute(filters: UnidadEducativaFilters = {}) {
        return await this.repository.findAll(filters);
    }
}

@Injectable()
export class GetUnidadEducativaByIdUseCase {
    constructor(
        @Inject(UNIDAD_EDUCATIVA_REPOSITORY)
        private readonly repository: IUnidadEducativaRepository,
    ) { }

    async execute(id: string) {
        const entity = await this.repository.findById(id);
        if (!entity) throw new NotFoundException(`UnidadEducativa ${id} no encontrada`);
        return entity;
    }
}
