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
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UploadConfigService } from './upload-config.service';

@Controller('upload-configs')
@UseGuards(JwtAuthGuard)
export class UploadConfigController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  @Get()
  async findAll() {
    return this.uploadConfigService.findAll();
  }

  @Get(':tableName')
  async findOne(@Param('tableName') tableName: string) {
    return this.uploadConfigService.findOneByTable(tableName);
  }

  @Post()
  async create(@Body() data: any) {
    return this.uploadConfigService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.uploadConfigService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.uploadConfigService.remove(id);
  }
}
