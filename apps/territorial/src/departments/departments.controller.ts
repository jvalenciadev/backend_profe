import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
// import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard'; // To be implemented

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) { }

  @Post()
  // @UseGuards(JwtAuthGuard)
  create(@Body() createDepartmentDto: CreateDepartmentDto, @Req() req: any) {
    // Mock user for now if no Auth Guard active
    const user = req.user || { id: 1, username: 'admin' };
    return this.departmentsService.create(createDepartmentDto, user);
  }

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto, @Req() req: any) {
    const user = req.user || { id: 1, username: 'admin' };
    return this.departmentsService.update(+id, updateDepartmentDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user || { id: 1, username: 'admin' };
    return this.departmentsService.remove(+id, user);
  }
}
