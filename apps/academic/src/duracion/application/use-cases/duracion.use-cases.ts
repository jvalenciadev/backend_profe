import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DURACION_REPOSITORY } from '../../domain/repositories/duracion.repository.interface';
import type { IDuracionRepository } from '../../domain/repositories/duracion.repository.interface';

@Injectable()
export class GetDuracionsUseCase {
  constructor(@Inject(DURACION_REPOSITORY) private readonly repo: IDuracionRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetDuracionByIdUseCase {
  constructor(@Inject(DURACION_REPOSITORY) private readonly repo: IDuracionRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateDuracionUseCase {
  constructor(@Inject(DURACION_REPOSITORY) private readonly repo: IDuracionRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateDuracionUseCase {
  constructor(@Inject(DURACION_REPOSITORY) private readonly repo: IDuracionRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteDuracionUseCase {
  constructor(@Inject(DURACION_REPOSITORY) private readonly repo: IDuracionRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}