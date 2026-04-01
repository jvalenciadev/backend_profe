import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { TURNO_REPOSITORY } from '../../domain/repositories/turno.repository.interface';
import type { ITurnoRepository } from '../../domain/repositories/turno.repository.interface';

@Injectable()
export class GetTurnosUseCase {
  constructor(
    @Inject(TURNO_REPOSITORY) private readonly repo: ITurnoRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetTurnoByIdUseCase {
  constructor(
    @Inject(TURNO_REPOSITORY) private readonly repo: ITurnoRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateTurnoUseCase {
  constructor(
    @Inject(TURNO_REPOSITORY) private readonly repo: ITurnoRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateTurnoUseCase {
  constructor(
    @Inject(TURNO_REPOSITORY) private readonly repo: ITurnoRepository,
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
export class DeleteTurnoUseCase {
  constructor(
    @Inject(TURNO_REPOSITORY) private readonly repo: ITurnoRepository,
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
