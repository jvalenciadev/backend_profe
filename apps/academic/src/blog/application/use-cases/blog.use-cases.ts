import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BLOG_REPOSITORY } from '../../domain/repositories/blog.repository.interface';
import type { IBlogRepository } from '../../domain/repositories/blog.repository.interface';
import { Blog } from '../../domain/entities/blog.entity';

@Injectable()
export class GetBlogsUseCase {
    constructor(@Inject(BLOG_REPOSITORY) private readonly repo: IBlogRepository) { }
    async execute(filter?: any, ability?: any): Promise<Blog[]> {
        return this.repo.findAll(filter, ability);
    }
}

@Injectable()
export class GetBlogByIdUseCase {
    constructor(@Inject(BLOG_REPOSITORY) private readonly repo: IBlogRepository) { }
    async execute(id: string, ability?: any): Promise<Blog> {
        const blog = await this.repo.findById(id, ability);
        if (!blog) throw new NotFoundException(`Blog con ID ${id} no encontrado`);
        return blog;
    }
}

@Injectable()
export class CreateBlogUseCase {
    constructor(@Inject(BLOG_REPOSITORY) private readonly repo: IBlogRepository) { }
    async execute(data: any, userId?: string, tenantId?: string): Promise<Blog> {
        return this.repo.create(data, userId, tenantId);
    }
}

@Injectable()
export class UpdateBlogUseCase {
    constructor(@Inject(BLOG_REPOSITORY) private readonly repo: IBlogRepository) { }
    async execute(id: string, data: any, userId?: string, ability?: any): Promise<Blog> {
        return this.repo.update(id, data, userId, ability);
    }
}

@Injectable()
export class DeleteBlogUseCase {
    constructor(@Inject(BLOG_REPOSITORY) private readonly repo: IBlogRepository) { }
    async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
        await this.repo.delete(id, userId, ability);
        return { message: 'Blog eliminado correctamente' };
    }
}
