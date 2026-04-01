import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EVENTOPERSONA_REPOSITORY } from '../../domain/repositories/evento-persona.repository.interface';
import type { IEventoPersonaRepository } from '../../domain/repositories/evento-persona.repository.interface';

@Injectable()
export class GetEventoPersonasUseCase {
  constructor(
    @Inject(EVENTOPERSONA_REPOSITORY)
    private readonly repo: IEventoPersonaRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetEventoPersonaByIdUseCase {
  constructor(
    @Inject(EVENTOPERSONA_REPOSITORY)
    private readonly repo: IEventoPersonaRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateEventoPersonaUseCase {
  constructor(
    @Inject(EVENTOPERSONA_REPOSITORY)
    private readonly repo: IEventoPersonaRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateEventoPersonaUseCase {
  constructor(
    @Inject(EVENTOPERSONA_REPOSITORY)
    private readonly repo: IEventoPersonaRepository,
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
export class DeleteEventoPersonaUseCase {
  constructor(
    @Inject(EVENTOPERSONA_REPOSITORY)
    private readonly repo: IEventoPersonaRepository,
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
