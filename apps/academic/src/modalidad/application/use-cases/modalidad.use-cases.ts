import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { MODALIDAD_REPOSITORY } from '../../domain/repositories/modalidad.repository.interface';
import type { IModalidadRepository } from '../../domain/repositories/modalidad.repository.interface';

@Injectable()
export class GetModalidadsUseCase {
  constructor(
    @Inject(MODALIDAD_REPOSITORY) private readonly repo: IModalidadRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetModalidadByIdUseCase {
  constructor(
    @Inject(MODALIDAD_REPOSITORY) private readonly repo: IModalidadRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateModalidadUseCase {
  constructor(
    @Inject(MODALIDAD_REPOSITORY) private readonly repo: IModalidadRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateModalidadUseCase {
  constructor(
    @Inject(MODALIDAD_REPOSITORY) private readonly repo: IModalidadRepository,
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
export class DeleteModalidadUseCase {
  constructor(
    @Inject(MODALIDAD_REPOSITORY) private readonly repo: IModalidadRepository,
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
