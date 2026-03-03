import { Cargo } from '../entities/cargo.entity';

export const CARGO_REPOSITORY = 'CARGO_REPOSITORY';

export interface CargoFilters {
    search?: string;
    estado?: string;
    page?: number;
    limit?: number;
}

export interface ICargoRepository {
    create(cargo: Omit<Cargo, 'id'>): Promise<Cargo>;
    findById(id: string): Promise<Cargo | null>;
    findAll(filters?: CargoFilters): Promise<{ data: Cargo[]; total: number }>;
    update(id: string, cargo: Partial<Cargo>): Promise<Cargo>;
    delete(id: string): Promise<boolean>;
}
