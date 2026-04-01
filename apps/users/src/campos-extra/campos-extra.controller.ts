import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CamposExtraService } from './campos-extra.service';
import { JwtAuthGuard } from '@app/common';

@UseGuards(JwtAuthGuard)
@Controller('users/campos-extra')
export class CamposExtraController {
  constructor(private readonly camposExtraService: CamposExtraService) {}

  @Get()
  async getCamposExtra() {
    return this.camposExtraService.findAll();
  }

  @Post()
  async crearCampoExtra(@Body() data: any) {
    return this.camposExtraService.create(data);
  }

  @Put(':id')
  async actualizarCampoExtra(@Param('id') id: string, @Body() data: any) {
    return this.camposExtraService.update(id, data);
  }

  @Delete(':id')
  async eliminarCampoExtra(@Param('id') id: string) {
    return this.camposExtraService.delete(id);
  }
}
