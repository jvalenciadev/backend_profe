import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { GetAllUsersUseCase } from '../../application/use-cases/get-all-users.use-case';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

@Controller('users-clean')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
  ) {}

  @Post()
  create(@Body() data: any) {
    return this.createUserUseCase.execute(data);
  }

  @Get()
  findAll(@Query() filter: any) {
    return this.getAllUsersUseCase.execute(filter);
  }
}
