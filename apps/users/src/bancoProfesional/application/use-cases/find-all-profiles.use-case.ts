import { Injectable, Inject } from '@nestjs/common';
import { type IBancoProfesionalRepository } from '../../domain/repositories/banco-profesional.repository.interface';
import { BancoProfesional } from '../../domain/entities/banco-profesional.entity';

@Injectable()
export class FindAllProfilesUseCase {
  constructor(
    @Inject('BANCO_PROFESIONAL_REPOSITORY')
    private readonly repository: IBancoProfesionalRepository,
  ) {}

  async execute(filter: any = {}): Promise<BancoProfesional[]> {
    // Solo listamos POSTULACION_PROFE y que NO estén inactivos ni eliminados
    const queryFilter: any = {
      ...filter,
      cargoPostulacionId: { not: null },
      roles: {
        some: {
          role: {
            name: 'POSTULACION_PROFE',
          },
        },
      },
    };

    // Si no se especifica el estado, mostramos activos y pendientes exclusivamente
    if (!filter.estado) {
      queryFilter.estado = { in: ['activo', 'pendiente'] };
    }

    return this.repository.findAll(queryFilter);
  }
}
