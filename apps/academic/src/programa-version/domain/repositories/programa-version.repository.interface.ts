import { ProgramaVersion } from '../entities/programa-version.entity';

export const PROGRAMAVERSION_REPOSITORY = 'PROGRAMAVERSION_REPOSITORY';

export interface IProgramaVersionRepository {
  findAll(filter?: any, ability?: any, user?: any): Promise<any[]>;
  findById(id: string, ability?: any): Promise<any | null>;
  create(data: any, userId?: string, forcedTenantId?: string): Promise<any>;
  update(id: string, data: any, userId?: string, ability?: any): Promise<any>;
  delete(id: string, userId?: string, ability?: any): Promise<void>;
}
