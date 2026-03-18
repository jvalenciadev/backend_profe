import { Injectable, Inject } from '@nestjs/common';
import { CARGO_REPOSITORY, CargoFilters } from '../../domain/repositories/cargo.repository.interface';
import type { ICargoRepository } from '../../domain/repositories/cargo.repository.interface';
import { Cargo } from '../../domain/entities/cargo.entity';

@Injectable()
export class GetCargosUseCase {
    constructor(
        @Inject(CARGO_REPOSITORY)
        private readonly cargoRepository: ICargoRepository,
    ) { }

    async execute(filters: CargoFilters = {}, ability?: any): Promise<{ data: Cargo[]; total: number }> {
        return await this.cargoRepository.findAll(filters, ability);
    }
}

@Injectable()
export class GetCargoByIdUseCase {
    constructor(
        @Inject(CARGO_REPOSITORY)
        private readonly cargoRepository: ICargoRepository,
    ) { }

    async execute(id: string, ability?: any): Promise<Cargo> {
        const cargo = await this.cargoRepository.findById(id, ability);
        if (!cargo) {
            throw new Error('Cargo no encontrado');
        }
        return cargo;
    }
}
