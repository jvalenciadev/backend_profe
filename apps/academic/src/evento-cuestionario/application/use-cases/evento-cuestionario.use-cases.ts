import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EVENTOCUESTIONARIO_REPOSITORY } from '../../domain/repositories/evento-cuestionario.repository.interface';
import type { IEventoCuestionarioRepository } from '../../domain/repositories/evento-cuestionario.repository.interface';

@Injectable()
export class GetEventoCuestionariosUseCase {
  constructor(
    @Inject(EVENTOCUESTIONARIO_REPOSITORY)
    private readonly repo: IEventoCuestionarioRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetEventoCuestionarioByIdUseCase {
  constructor(
    @Inject(EVENTOCUESTIONARIO_REPOSITORY)
    private readonly repo: IEventoCuestionarioRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateEventoCuestionarioUseCase {
  constructor(
    @Inject(EVENTOCUESTIONARIO_REPOSITORY)
    private readonly repo: IEventoCuestionarioRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateEventoCuestionarioUseCase {
  constructor(
    @Inject(EVENTOCUESTIONARIO_REPOSITORY)
    private readonly repo: IEventoCuestionarioRepository,
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
export class DeleteEventoCuestionarioUseCase {
  constructor(
    @Inject(EVENTOCUESTIONARIO_REPOSITORY)
    private readonly repo: IEventoCuestionarioRepository,
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

@Injectable()
export class GetEventoProgressUseCase {
  constructor(
    @Inject(EVENTOCUESTIONARIO_REPOSITORY)
    private readonly repo: IEventoCuestionarioRepository,
  ) {}
  async execute(eventoId: string, personaId: string): Promise<any[]> {
    return this.repo.findProgressForPersona(eventoId, personaId);
  }
}
