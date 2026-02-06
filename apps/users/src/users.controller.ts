import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/src/guards/jwt-auth.guard';
import { PoliciesGuard } from '@app/common/guards/policies.guard';
import { Action } from '@app/common/casl/casl-ability.factory';
import { CheckPolicies } from '@app/common/decorators/check-policies.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @CheckPolicies({ action: Action.Create, subject: 'User' })
  create(@Body() data: any, @Req() req: any) {
    const currentUser = req.user || { id: 1 };
    return this.usersService.create(data, currentUser);
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const currentUser = req.user || { id: 1 };
    return this.usersService.update(id, data, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const currentUser = req.user || { id: 1 };
    return this.usersService.remove(id, currentUser);
  }
}
