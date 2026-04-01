import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsString()
  apellidos: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  correo: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsUUID(undefined, { each: true })
  @IsArray()
  roleIds?: string[];

  @IsOptional()
  @IsUUID(undefined, { each: true })
  @IsArray()
  sedeIds?: string[];

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
