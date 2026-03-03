import { PartialType } from '@nestjs/mapped-types';
import { CreateProfeDto } from './create-profe.dto';

export class UpdateProfeDto extends PartialType(CreateProfeDto) { }
