import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
    GetBlogsUseCase, GetBlogByIdUseCase, CreateBlogUseCase, UpdateBlogUseCase, DeleteBlogUseCase
} from '../../application/use-cases/blog.use-cases';

@Controller('blogs')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BlogsController {
    constructor(
        private readonly getBlogsUseCase: GetBlogsUseCase,
        private readonly getBlogByIdUseCase: GetBlogByIdUseCase,
        private readonly createBlogUseCase: CreateBlogUseCase,
        private readonly updateBlogUseCase: UpdateBlogUseCase,
        private readonly deleteBlogUseCase: DeleteBlogUseCase,
    ) { }

    @Get()
    @CheckPolicies((ability: any) => ability.can('read', 'Blog'))
    findAll(@Query() query: any, @Req() req: any) {
        const isAdmin = req.user.roles?.some((r: any) => r.role?.name === 'ADMINISTRADOR');
        const tenantId = isAdmin ? undefined : req.user.tenantId;

        return this.getBlogsUseCase.execute({ search: query.search, tenantId }, req.ability);
    }

    @Get(':id')
    @CheckPolicies((ability: any) => ability.can('read', 'Blog'))
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.getBlogByIdUseCase.execute(id, req.ability);
    }

    @Post()
    @CheckPolicies((ability: any) => ability.can('create', 'Blog'))
    create(@Body() data: any, @Req() req: any) {
        const isAdmin = req.user.roles?.some((r: any) => r.role?.name === 'ADMINISTRADOR');
        const tenantId = isAdmin ? data.tenantId : req.user.tenantId;
        return this.createBlogUseCase.execute(data, req.user?.id, tenantId);
    }

    @Put(':id')
    @CheckPolicies((ability: any) => ability.can('update', 'Blog'))
    updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
        return this.updateBlogUseCase.execute(id, data, req.user?.id, req.ability);
    }

    @Patch(':id')
    @CheckPolicies((ability: any) => ability.can('update', 'Blog'))
    updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
        return this.updateBlogUseCase.execute(id, data, req.user?.id, req.ability);
    }

    @Delete(':id')
    @CheckPolicies((ability: any) => ability.can('delete', 'Blog'))
    remove(@Param('id') id: string, @Req() req: any) {
        return this.deleteBlogUseCase.execute(id, req.user?.id, req.ability);
    }
}
