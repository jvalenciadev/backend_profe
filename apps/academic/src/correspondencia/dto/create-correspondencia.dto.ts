import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum CorTipoDocumento {
  INFORME = 'INFORME',
  NOTA_INTERNA = 'NOTA_INTERNA',
  MEMORANDUM = 'MEMORANDUM',
  INSTRUCTIVO = 'INSTRUCTIVO',
}

export class CreateCorrespondenciaDto {
  @IsEnum(CorTipoDocumento)
  tipo: CorTipoDocumento;

  @IsString()
  @IsOptional()
  hr?: string;

  @IsString()
  @IsNotEmpty()
  referencia: string;

  @IsString()
  @IsOptional()
  contenido?: string;

  @IsInt()
  @IsOptional()
  plazoDias?: number;

  @IsUUID()
  @IsOptional()
  documentoPadreId?: string;

  @IsArray()
  destinatarios: { userId: string; cargoLiteral?: string }[];

  @IsArray()
  @IsOptional()
  vias?: { userId: string; cargoLiteral?: string }[];

  @IsArray()
  remitentes: { userId: string; cargoLiteral?: string }[];
}
