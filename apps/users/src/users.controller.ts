import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';

@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @CheckPolicies(ability => ability.can('create', 'User'))
  create(@Body() data: any, @Req() req: any) {
    return this.usersService.create(data, req.user);
  }

  @Get()
  @CheckPolicies(ability => ability.can('read', 'User'))
  findAll(@Req() req: any, @Query('search') search?: string) {
    // Pasamos el 'ability' al servicio para que Prisma aplique los filtros dinámicos (ABAC)
    return this.usersService.findAll(req.ability, search);
  }

  @Get(':id')
  @CheckPolicies(ability => ability.can('read', 'User'))
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findOne(id, req.ability);
  }

  @Put('profile')
  async updateProfilePut(@Req() req: any, @Body() data: any) {
    return this.usersService.update(req.user.id, data, req.user, req.ability);
  }

  @Patch('profile')
  async updateProfilePatch(@Req() req: any, @Body() data: any) {
    return this.usersService.update(req.user.id, data, req.user, req.ability);
  }

  @Put(':id')
  @CheckPolicies(ability => ability.can('update', 'User'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.usersService.update(id, data, req.user, req.ability);
  }

  @Patch(':id')
  @CheckPolicies(ability => ability.can('update', 'User'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.usersService.update(id, data, req.user, req.ability);
  }

  @Delete(':id')
  @CheckPolicies(ability => ability.can('delete', 'User'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, req.user);
  }
}
