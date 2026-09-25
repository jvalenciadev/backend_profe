import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EVENTO_REPOSITORY } from '../../domain/repositories/evento.repository.interface';
import type { IEventoRepository } from '../../domain/repositories/evento.repository.interface';
import { Evento } from '../../domain/entities/evento.entity';

@Injectable()
export class GetEventosUseCase {
  constructor(
    @Inject(EVENTO_REPOSITORY) private readonly repo: IEventoRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<Evento[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetEventoByIdUseCase {
  constructor(
    @Inject(EVENTO_REPOSITORY) private readonly repo: IEventoRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<Evento> {
    const evento = await this.repo.findById(id, ability);
    if (!evento)
      throw new NotFoundException(
        `Evento con ID ${id} no encontrado o sin permisos`,
      );
    return evento;
  }
}

@Injectable()
export class CreateEventoUseCase {
  constructor(
    @Inject(EVENTO_REPOSITORY) private readonly repo: IEventoRepository,
  ) {}
  async execute(data: any, userId?: string): Promise<Evento> {
    if (data.codigo && typeof data.codigo === 'string' && data.codigo.trim()) {
      const existing = await this.repo.findByCodigo(data.codigo.trim());
      if (existing) {
        throw new BadRequestException(
          `El código interno '${data.codigo.trim()}' ya está registrado en otro evento. Debe ser único.`,
        );
      }
    }
    return this.repo.create(data, userId);
  }
}

@Injectable()
export class UpdateEventoUseCase {
  constructor(
    @Inject(EVENTO_REPOSITORY) private readonly repo: IEventoRepository,
  ) {}
  async execute(id: string, data: any, userId?: string): Promise<Evento> {
    const existing = await this.repo.findById(id);
    if (!existing)
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);

    if (data.codigo && typeof data.codigo === 'string' && data.codigo.trim()) {
      const byCodigo = await this.repo.findByCodigo(data.codigo.trim());
      if (byCodigo && byCodigo.id !== id) {
        throw new BadRequestException(
          `El código interno '${data.codigo.trim()}' ya está registrado en otro evento. Debe ser único.`,
        );
      }
    }

    return this.repo.update(id, data, userId);
  }
}

@Injectable()
export class DeleteEventoUseCase {
  constructor(
    @Inject(EVENTO_REPOSITORY) private readonly repo: IEventoRepository,
  ) {}
  async execute(id: string, userId?: string): Promise<{ message: string }> {
    const existing = await this.repo.findById(id);
    if (!existing)
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    await this.repo.delete(id, userId);
    return { message: 'Evento eliminado correctamente' };
  }
}
