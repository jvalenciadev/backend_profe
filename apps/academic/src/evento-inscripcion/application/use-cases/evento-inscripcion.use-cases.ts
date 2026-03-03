import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EVENTOINSCRIPCION_REPOSITORY } from '../../domain/repositories/evento-inscripcion.repository.interface';
import type { IEventoInscripcionRepository } from '../../domain/repositories/evento-inscripcion.repository.interface';

@Injectable()
export class GetEventoInscripcionsUseCase {
  constructor(@Inject(EVENTOINSCRIPCION_REPOSITORY) private readonly repo: IEventoInscripcionRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetEventoInscripcionByIdUseCase {
  constructor(@Inject(EVENTOINSCRIPCION_REPOSITORY) private readonly repo: IEventoInscripcionRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateEventoInscripcionUseCase {
  constructor(@Inject(EVENTOINSCRIPCION_REPOSITORY) private readonly repo: IEventoInscripcionRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateEventoInscripcionUseCase {
  constructor(@Inject(EVENTOINSCRIPCION_REPOSITORY) private readonly repo: IEventoInscripcionRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteEventoInscripcionUseCase {
  constructor(@Inject(EVENTOINSCRIPCION_REPOSITORY) private readonly repo: IEventoInscripcionRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}