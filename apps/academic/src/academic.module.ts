import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';

@Module({
  imports: [],
  controllers: [AcademicController],
  providers: [AcademicService],
})
export class AcademicModule {}
