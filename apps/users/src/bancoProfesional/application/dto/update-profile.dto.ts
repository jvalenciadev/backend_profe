import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @ValidateIf((o) => o.fechaNac !== '' && o.fechaNac !== null && o.fechaNac !== undefined)
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida en formato AAAA-MM-DD.' })
  fechaNac?: string;

  @IsOptional()
  @IsNumber()
  ci?: number;

  @IsOptional()
  @IsNumber()
  rda?: number;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  esMaestro?: boolean;

  @IsOptional()
  @IsBoolean()
  licUniversitaria?: boolean;

  @IsOptional()
  @IsBoolean()
  licMescp?: boolean;

  @IsOptional()
  @IsBoolean()
  tieneProduccion?: boolean;

  @IsOptional()
  @IsString()
  hojaDeVidaPdf?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  resumenProfesional?: string;

  @IsOptional()
  @IsString()
  habilidades?: string;

  @IsOptional()
  @IsString()
  idiomas?: string;

  @IsOptional()
  @IsString()
  experienciaLaboral?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  estadoCivil?: string;

  @IsOptional()
  @IsString()
  imagen?: string;

  @IsOptional()
  @IsString()
  rdaPdf?: string;

  @IsOptional()
  @IsUUID()
  cargoId?: string;
}
