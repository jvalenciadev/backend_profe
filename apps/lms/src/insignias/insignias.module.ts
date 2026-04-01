import { Module } from '@nestjs/common';
import { InsigniasService } from './insignias.service';
import { DatabaseModule } from '@app/database';

import { InsigniasController } from './insignias.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [InsigniasController],
  providers: [InsigniasService],
  exports: [InsigniasService],
})
export class InsigniasModule {}
