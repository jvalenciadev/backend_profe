import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AREA_REPOSITORY } from '../../domain/repositories/areas-crud.repository.interface';
import type { IAreaRepository } from '../../domain/repositories/areas-crud.repository.interface';

@Injectable()
export class GetAreasUseCase {
  constructor(
    @Inject(AREA_REPOSITORY) private readonly repo: IAreaRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetAreaByIdUseCase {
  constructor(
    @Inject(AREA_REPOSITORY) private readonly repo: IAreaRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateAreaUseCase {
  constructor(
    @Inject(AREA_REPOSITORY) private readonly repo: IAreaRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateAreaUseCase {
  constructor(
    @Inject(AREA_REPOSITORY) private readonly repo: IAreaRepository,
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
export class DeleteAreaUseCase {
  constructor(
    @Inject(AREA_REPOSITORY) private readonly repo: IAreaRepository,
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
