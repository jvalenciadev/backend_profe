import { Injectable, Inject } from '@nestjs/common';
import { OFERTA_REPOSITORY } from '../../domain/repositories/oferta.repository.interface';
import type { IOfertaRepository } from '../../domain/repositories/oferta.repository.interface';
import { Oferta } from '../../domain/entities/oferta.entity';

@Injectable()
export class GetOfertasUseCase {
  constructor(
    @Inject(OFERTA_REPOSITORY)
    private readonly repository: IOfertaRepository,
  ) {}

  async execute(filters?: any, ability?: any): Promise<Oferta[]> {
    return this.repository.findAll(filters, ability);
  }
}

@Injectable()
export class GetOfertaByIdUseCase {
  constructor(
    @Inject(OFERTA_REPOSITORY)
    private readonly repository: IOfertaRepository,
  ) {}

  async execute(id: string, ability?: any): Promise<Oferta | null> {
    return this.repository.findById(id, ability);
  }
}
