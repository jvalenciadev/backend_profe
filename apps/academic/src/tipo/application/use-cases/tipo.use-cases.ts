import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { TIPO_REPOSITORY } from '../../domain/repositories/tipo.repository.interface';
import type { ITipoRepository } from '../../domain/repositories/tipo.repository.interface';

@Injectable()
export class GetTiposUseCase {
  constructor(@Inject(TIPO_REPOSITORY) private readonly repo: ITipoRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetTipoByIdUseCase {
  constructor(@Inject(TIPO_REPOSITORY) private readonly repo: ITipoRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateTipoUseCase {
  constructor(@Inject(TIPO_REPOSITORY) private readonly repo: ITipoRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateTipoUseCase {
  constructor(@Inject(TIPO_REPOSITORY) private readonly repo: ITipoRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteTipoUseCase {
  constructor(@Inject(TIPO_REPOSITORY) private readonly repo: ITipoRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}