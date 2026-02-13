import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  providers: [CommonService],
  exports: [CommonService, DatabaseModule],
})
export class CommonModule { }
