import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}
