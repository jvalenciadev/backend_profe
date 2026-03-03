import { Injectable, Inject } from '@nestjs/common';
import { DISTRITO_REPOSITORY } from '../../domain/repositories/distrito.repository.interface';
import type { IDistritoRepository } from '../../domain/repositories/distrito.repository.interface';
import { Distrito } from '../../domain/entities/distrito.entity';

@Injectable()
export class UpdateDistritoUseCase {
  constructor(
    @Inject(DISTRITO_REPOSITORY)
    private readonly repository: IDistritoRepository,
  ) {}

  async execute(id: string, data: Partial<Distrito>): Promise<Distrito> {
    return await this.repository.update(id, data);
  }
}

@Injectable()
export class DeleteDistritoUseCase {
  constructor(
    @Inject(DISTRITO_REPOSITORY)
    private readonly repository: IDistritoRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }
}
