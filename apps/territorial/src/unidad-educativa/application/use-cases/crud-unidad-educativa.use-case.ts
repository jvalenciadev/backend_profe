import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UNIDAD_EDUCATIVA_REPOSITORY } from '../../domain/repositories/unidad-educativa.repository.interface';
import type { IUnidadEducativaRepository } from '../../domain/repositories/unidad-educativa.repository.interface';

@Injectable()
export class CreateUnidadEducativaUseCase {
    constructor(
        @Inject(UNIDAD_EDUCATIVA_REPOSITORY)
        private readonly repository: IUnidadEducativaRepository,
    ) { }

    async execute(data: any) {
        if (data.codigo) data.codigo = Number(data.codigo);
        return await this.repository.create(data);
    }
}

@Injectable()
export class UpdateUnidadEducativaUseCase {
    constructor(
        @Inject(UNIDAD_EDUCATIVA_REPOSITORY)
        private readonly repository: IUnidadEducativaRepository,
    ) { }

    async execute(id: string, data: any) {
        const existing = await this.repository.findById(id);
        if (!existing) throw new NotFoundException(`UnidadEducativa ${id} no encontrada`);
        return await this.repository.update(id, data);
    }
}

@Injectable()
export class DeleteUnidadEducativaUseCase {
    constructor(
        @Inject(UNIDAD_EDUCATIVA_REPOSITORY)
        private readonly repository: IUnidadEducativaRepository,
    ) { }

    async execute(id: string) {
        const existing = await this.repository.findById(id);
        if (!existing) throw new NotFoundException(`UnidadEducativa ${id} no encontrada`);
        return await this.repository.delete(id);
    }
}
