import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EVENTOPREGUNTA_REPOSITORY } from '../../domain/repositories/evento-pregunta.repository.interface';
import type { IEventoPreguntaRepository } from '../../domain/repositories/evento-pregunta.repository.interface';

@Injectable()
export class GetEventoPreguntasUseCase {
  constructor(
    @Inject(EVENTOPREGUNTA_REPOSITORY)
    private readonly repo: IEventoPreguntaRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetEventoPreguntaByIdUseCase {
  constructor(
    @Inject(EVENTOPREGUNTA_REPOSITORY)
    private readonly repo: IEventoPreguntaRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateEventoPreguntaUseCase {
  constructor(
    @Inject(EVENTOPREGUNTA_REPOSITORY)
    private readonly repo: IEventoPreguntaRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateEventoPreguntaUseCase {
  constructor(
    @Inject(EVENTOPREGUNTA_REPOSITORY)
    private readonly repo: IEventoPreguntaRepository,
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
export class DeleteEventoPreguntaUseCase {
  constructor(
    @Inject(EVENTOPREGUNTA_REPOSITORY)
    private readonly repo: IEventoPreguntaRepository,
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
