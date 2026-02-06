import { Controller, Get } from '@nestjs/common';
import { AcademicService } from './academic.service';

@Controller()
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Get()
  getHello(): string {
    return this.academicService.getHello();
  }
}
