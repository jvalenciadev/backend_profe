import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ESTADOINSCRIPCION_REPOSITORY } from '../../domain/repositories/estado-inscripcion.repository.interface';
import type { IEstadoInscripcionRepository } from '../../domain/repositories/estado-inscripcion.repository.interface';

@Injectable()
export class GetEstadoInscripcionsUseCase {
  constructor(
    @Inject(ESTADOINSCRIPCION_REPOSITORY)
    private readonly repo: IEstadoInscripcionRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetEstadoInscripcionByIdUseCase {
  constructor(
    @Inject(ESTADOINSCRIPCION_REPOSITORY)
    private readonly repo: IEstadoInscripcionRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateEstadoInscripcionUseCase {
  constructor(
    @Inject(ESTADOINSCRIPCION_REPOSITORY)
    private readonly repo: IEstadoInscripcionRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateEstadoInscripcionUseCase {
  constructor(
    @Inject(ESTADOINSCRIPCION_REPOSITORY)
    private readonly repo: IEstadoInscripcionRepository,
  ) {}
  async execute(
    id: string,
    data: any,
    userId?: string,
    ability?: any,
  ): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteEstadoInscripcionUseCase {
  constructor(
    @Inject(ESTADOINSCRIPCION_REPOSITORY)
    private readonly repo: IEstadoInscripcionRepository,
  ) {}
  async execute(
    id: string,
    userId?: string,
    ability?: any,
  ): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}
