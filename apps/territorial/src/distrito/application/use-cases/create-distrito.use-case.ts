import { Injectable, Inject } from '@nestjs/common';
import { DISTRITO_REPOSITORY } from '../../domain/repositories/distrito.repository.interface';
import type { IDistritoRepository } from '../../domain/repositories/distrito.repository.interface';
import { Distrito } from '../../domain/entities/distrito.entity';

@Injectable()
export class CreateDistritoUseCase {
  constructor(
    @Inject(DISTRITO_REPOSITORY)
    private readonly repository: IDistritoRepository,
  ) {}

  async execute(data: any): Promise<Distrito> {
    return await this.repository.create({ ...data, estado: data.estado || 'activo' });
  }
}
