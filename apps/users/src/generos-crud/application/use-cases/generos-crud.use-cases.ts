import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { GENERO_REPOSITORY } from '../../domain/repositories/generos-crud.repository.interface';
import type { IGeneroRepository } from '../../domain/repositories/generos-crud.repository.interface';

@Injectable()
export class GetGenerosUseCase {
  constructor(@Inject(GENERO_REPOSITORY) private readonly repo: IGeneroRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetGeneroByIdUseCase {
  constructor(@Inject(GENERO_REPOSITORY) private readonly repo: IGeneroRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateGeneroUseCase {
  constructor(@Inject(GENERO_REPOSITORY) private readonly repo: IGeneroRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateGeneroUseCase {
  constructor(@Inject(GENERO_REPOSITORY) private readonly repo: IGeneroRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteGeneroUseCase {
  constructor(@Inject(GENERO_REPOSITORY) private readonly repo: IGeneroRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}