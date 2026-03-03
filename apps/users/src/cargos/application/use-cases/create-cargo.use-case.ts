import { Injectable, Inject } from '@nestjs/common';
import { CARGO_REPOSITORY } from '../../domain/repositories/cargo.repository.interface';
import type { ICargoRepository } from '../../domain/repositories/cargo.repository.interface';
import { Cargo } from '../../domain/entities/cargo.entity';

@Injectable()
export class CreateCargoUseCase {
    constructor(
        @Inject(CARGO_REPOSITORY)
        private readonly cargoRepository: ICargoRepository,
    ) { }

    async execute(data: { nombre: string; estado?: string; createdBy?: string }): Promise<Cargo> {
        // Validaciones de negocio irían aquí puramente
        const newCargo = {
            nombre: data.nombre,
            estado: data.estado || 'activo',
            createdBy: data.createdBy,
        } as Omit<Cargo, 'id'>;

        return await this.cargoRepository.create(newCargo);
    }
}
