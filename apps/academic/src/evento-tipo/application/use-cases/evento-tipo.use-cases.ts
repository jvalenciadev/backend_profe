import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EVENTOTIPO_REPOSITORY } from '../../domain/repositories/evento-tipo.repository.interface';
import type { IEventoTipoRepository } from '../../domain/repositories/evento-tipo.repository.interface';

@Injectable()
export class GetEventoTiposUseCase {
  constructor(
    @Inject(EVENTOTIPO_REPOSITORY) private readonly repo: IEventoTipoRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetEventoTipoByIdUseCase {
  constructor(
    @Inject(EVENTOTIPO_REPOSITORY) private readonly repo: IEventoTipoRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateEventoTipoUseCase {
  constructor(
    @Inject(EVENTOTIPO_REPOSITORY) private readonly repo: IEventoTipoRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateEventoTipoUseCase {
  constructor(
    @Inject(EVENTOTIPO_REPOSITORY) private readonly repo: IEventoTipoRepository,
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
export class DeleteEventoTipoUseCase {
  constructor(
    @Inject(EVENTOTIPO_REPOSITORY) private readonly repo: IEventoTipoRepository,
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
