import { PartialType } from '@nestjs/mapped-types';
import { CreateComunicadoDto } from './create-comunicado.dto';

export class UpdateComunicadoDto extends PartialType(CreateComunicadoDto) {}
