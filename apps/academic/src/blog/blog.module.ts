import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { BLOG_REPOSITORY } from './domain/repositories/blog.repository.interface';
import { PrismaBlogRepository } from './infrastructure/database/prisma-blog.repository';
import { BlogsController } from './infrastructure/controllers/blogs.controller';
import {
    GetBlogsUseCase, GetBlogByIdUseCase, CreateBlogUseCase, UpdateBlogUseCase, DeleteBlogUseCase
} from './application/use-cases/blog.use-cases';

@Module({
    imports: [DatabaseModule, CaslModule],
    controllers: [BlogsController],
    providers: [
        { provide: BLOG_REPOSITORY, useClass: PrismaBlogRepository },
        GetBlogsUseCase,
        GetBlogByIdUseCase,
        CreateBlogUseCase,
        UpdateBlogUseCase,
        DeleteBlogUseCase,
    ],
})
export class BlogModule { }
