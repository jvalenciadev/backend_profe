import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { AulaCategoriaController } from './aula-categoria.controller';
import { AulaCategoriaService } from './aula-categoria.service';

@Module({
    imports: [DatabaseModule, CaslModule],
    controllers: [AulaCategoriaController],
    providers: [AulaCategoriaService],
})
export class AulaCategoriaModule { }
