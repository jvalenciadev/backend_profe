import { Blog } from '../entities/blog.entity';

export const BLOG_REPOSITORY = 'BLOG_REPOSITORY';

export interface IBlogRepository {
  findAll(filter?: any, ability?: any): Promise<Blog[]>;
  findById(id: string, ability?: any): Promise<Blog | null>;
  create(data: any, userId?: string, forcedTenantId?: string): Promise<Blog>;
  update(id: string, data: any, userId?: string, ability?: any): Promise<Blog>;
  delete(id: string, userId?: string, ability?: any): Promise<void>;
}
