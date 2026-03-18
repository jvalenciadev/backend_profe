import { Module } from '@nestjs/common';
import { CuestionarioController } from './cuestionario.controller';
import { CuestionarioService } from './cuestionario.service';
import { DatabaseModule } from '@app/database';

@Module({
    imports: [DatabaseModule],
    controllers: [CuestionarioController],
    providers: [CuestionarioService],
    exports: [CuestionarioService]
})
export class CuestionarioModule { }
