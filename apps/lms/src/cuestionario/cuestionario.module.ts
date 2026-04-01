import { Module } from '@nestjs/common';
import { CuestionarioController } from './cuestionario.controller';
import { CuestionarioService } from './cuestionario.service';
import { CuestionarioAppController } from './cuestionario-app.controller';
import { CuestionarioAppService } from './cuestionario-app.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [CuestionarioController, CuestionarioAppController],
  providers: [CuestionarioService, CuestionarioAppService],
  exports: [CuestionarioService],
})
export class CuestionarioModule {}
