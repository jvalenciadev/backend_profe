import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { GetMyProfileUseCase } from '../../application/use-cases/get-my-profile.use-case';
import { FindAllProfilesUseCase } from '../../application/use-cases/find-all-profiles.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { ApproveProfessionalUseCase } from '../../application/use-cases/approve-professional.use-case';
import {
  ManagePosgradoUseCase,
  ManageProduccionUseCase,
} from '../../application/use-cases/manage-experience.use-case';
import { JwtAuthGuard, CurrentUser } from '@app/common';
import { UpdateProfileDto } from '../../application/dto/update-profile.dto';

@Controller('banco-profesional')
@UseGuards(JwtAuthGuard)
export class BancoProfesionalController {
  constructor(
    private readonly getMyProfileUseCase: GetMyProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly managePosgradoUseCase: ManagePosgradoUseCase,
    private readonly manageProduccionUseCase: ManageProduccionUseCase,
    private readonly findAllProfilesUseCase: FindAllProfilesUseCase,
    private readonly approveProfessionalUseCase: ApproveProfessionalUseCase,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    return this.findAllProfilesUseCase.execute(req.query);
  }

  @Patch(':id/aprobar')
  aprobar(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.approveProfessionalUseCase.execute(id, data, user.id);
  }

  @Get('ping')
  ping() {
    return { message: 'pong clean' };
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.getMyProfileUseCase.execute(user.id);
  }

  @Put('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.updateProfileUseCase.execute(user.id, dto, user.id);
  }

  // --- Posgrados ---
  @Post(':id/posgrados')
  addPosgrado(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.managePosgradoUseCase.add(id, data, user.id);
  }

  @Put('posgrados/:posgradoId')
  updatePosgrado(
    @Param('posgradoId') posgradoId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.managePosgradoUseCase.update(posgradoId, data, user.id);
  }

  @Delete('posgrados/:posgradoId')
  deletePosgrado(@Param('posgradoId') posgradoId: string) {
    return this.managePosgradoUseCase.delete(posgradoId);
  }

  // --- Producción ---
  @Post(':id/produccion')
  addProduccion(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.manageProduccionUseCase.add(id, data, user.id);
  }

  @Put('produccion/:produccionId')
  updateProduccion(
    @Param('produccionId') produccionId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.manageProduccionUseCase.update(produccionId, data, user.id);
  }

  @Delete('produccion/:produccionId')
  deleteProduccion(@Param('produccionId') produccionId: string) {
    return this.manageProduccionUseCase.delete(produccionId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.getMyProfileUseCase.execute(id);
  }
}
