import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SEDE_REPOSITORY } from '../../domain/repositories/sede.repository.interface';
import type { ISedeRepository } from '../../domain/repositories/sede.repository.interface';
import { Sede } from '../../domain/entities/sede.entity';

@Injectable()
export class UpdateSedeUseCase {
  constructor(
    @Inject(SEDE_REPOSITORY)
    private readonly repository: ISedeRepository,
  ) {}

  async execute(id: string, data: Partial<Sede>): Promise<Sede> {
    return await this.repository.update(id, data);
  }
}

@Injectable()
export class DeleteSedeUseCase {
  constructor(
    @Inject(SEDE_REPOSITORY)
    private readonly repository: ISedeRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }
}
