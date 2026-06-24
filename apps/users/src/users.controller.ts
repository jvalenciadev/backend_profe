import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  CreateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
  RequestEmailVerificationUseCase,
  ChangePasswordUseCase,
} from './user/application/use-cases/user.use-cases';

@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly resetPasswordUseCase: ResetUserPasswordUseCase,
    private readonly requestVerificationUseCase: RequestEmailVerificationUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'User'))
  create(@Body() data: any, @Req() req: any) {
    return this.createUserUseCase.execute(data, req.user);
  }

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'User'))
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('global') global?: string,
  ) {
    const includeParticipants = global === 'true';
    return this.findAllUsersUseCase.execute(req.ability, search, includeParticipants);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can('read', 'User'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.findUserByIdUseCase.execute(id, req.ability);
  }

  @Put('profile')
  updateProfilePut(@Req() req: any, @Body() data: any) {
    return this.updateUserUseCase.execute(req.user.id, data, req.user);
  }

  @Patch('profile')
  updateProfilePatch(@Req() req: any, @Body() data: any) {
    return this.updateUserUseCase.execute(req.user.id, data, req.user);
  }

  @Post('profile/change-password')
  changePassword(
    @Req() req: any,
    @Body('oldPassword') oldPass: string,
    @Body('newPassword') newPass: string,
  ) {
    return this.changePasswordUseCase.execute(req.user.id, oldPass, newPass);
  }

  @Put(':id')
  @CheckPolicies((ability) => ability.can('update', 'User'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateUserUseCase.execute(id, data, req.user, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'User'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateUserUseCase.execute(id, data, req.user, req.ability);
  }

  @Post(':id/reset-password')
  @CheckPolicies((ability) => ability.can('update', 'User'))
  resetPassword(@Param('id') id: string, @Req() req: any) {
    return this.resetPasswordUseCase.execute(id, req.user);
  }

  @Post('request-email-verification')
  requestEmailVerification(@Req() req: any, @Body('email') email: string) {
    return this.requestVerificationUseCase.execute(req.user.id, email);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can('delete', 'User'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteUserUseCase.execute(id, req.user);
  }
}
