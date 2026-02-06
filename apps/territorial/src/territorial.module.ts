import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TerritorialController } from './territorial.controller';
import { TerritorialService } from './territorial.service';
import { DepartmentsModule } from './departments/departments.module';

@Module({
  imports: [DepartmentsModule, DatabaseModule],
  controllers: [TerritorialController],
  providers: [TerritorialService],
})
export class TerritorialModule { }
