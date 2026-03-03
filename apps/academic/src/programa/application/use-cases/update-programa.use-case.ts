import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PROGRAMA_REPOSITORY } from '../../domain/repositories/programa.repository.interface';
import type { IProgramaRepository } from '../../domain/repositories/programa.repository.interface';
import { Programa } from '../../domain/entities/programa.entity';

@Injectable()
export class UpdateProgramaUseCase {
  constructor(
    @Inject(PROGRAMA_REPOSITORY)
    private readonly repository: IProgramaRepository,
  ) {}

  async execute(id: string, data: Partial<Programa>): Promise<Programa> {
    return await this.repository.update(id, data);
  }
}

@Injectable()
export class DeleteProgramaUseCase {
  constructor(
    @Inject(PROGRAMA_REPOSITORY)
    private readonly repository: IProgramaRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }
}
