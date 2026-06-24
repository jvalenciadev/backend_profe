import { Injectable, Inject } from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';
import { Inscripcion } from '../../domain/entities/inscripcion.entity';

@Injectable()
export class GetInscripcionsUseCase {
  constructor(
    @Inject(INSCRIPCION_REPOSITORY)
    private readonly repository: IInscripcionRepository,
  ) {}

  async execute(filter?: any, user?: any): Promise<Inscripcion[]> {
    return this.repository.findAll(filter, user);
  }
}
