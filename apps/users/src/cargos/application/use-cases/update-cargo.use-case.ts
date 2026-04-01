import { Injectable, Inject } from '@nestjs/common';
import { CARGO_REPOSITORY } from '../../domain/repositories/cargo.repository.interface';
import type { ICargoRepository } from '../../domain/repositories/cargo.repository.interface';
import { Cargo } from '../../domain/entities/cargo.entity';

@Injectable()
export class UpdateCargoUseCase {
  constructor(
    @Inject(CARGO_REPOSITORY)
    private readonly cargoRepository: ICargoRepository,
  ) {}

  async execute(id: string, data: Partial<Cargo>): Promise<Cargo> {
    // Verifica si existe
    const existing = await this.cargoRepository.findById(id);
    if (!existing) {
      throw new Error('Cargo no encontrado');
    }

    return await this.cargoRepository.update(id, data);
  }
}

@Injectable()
export class DeleteCargoUseCase {
  constructor(
    @Inject(CARGO_REPOSITORY)
    private readonly cargoRepository: ICargoRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    const existing = await this.cargoRepository.findById(id);
    if (!existing) {
      throw new Error('Cargo no encontrado');
    }

    // Aquí se define la regla de negocio: ¿Soft delete o Hard delete?
    // Usaremos lo que decida el repositorio o le pasamos {estado: eliminado}
    return await this.cargoRepository.delete(id);
  }
}
