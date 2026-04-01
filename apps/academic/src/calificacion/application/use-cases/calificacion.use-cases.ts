import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CALIFICACION_REPOSITORY } from '../../domain/repositories/calificacion.repository.interface';
import type { ICalificacionRepository } from '../../domain/repositories/calificacion.repository.interface';

@Injectable()
export class GetCalificacionsUseCase {
  constructor(
    @Inject(CALIFICACION_REPOSITORY)
    private readonly repo: ICalificacionRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetCalificacionByIdUseCase {
  constructor(
    @Inject(CALIFICACION_REPOSITORY)
    private readonly repo: ICalificacionRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateCalificacionUseCase {
  constructor(
    @Inject(CALIFICACION_REPOSITORY)
    private readonly repo: ICalificacionRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateCalificacionUseCase {
  constructor(
    @Inject(CALIFICACION_REPOSITORY)
    private readonly repo: ICalificacionRepository,
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
export class DeleteCalificacionUseCase {
  constructor(
    @Inject(CALIFICACION_REPOSITORY)
    private readonly repo: ICalificacionRepository,
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
