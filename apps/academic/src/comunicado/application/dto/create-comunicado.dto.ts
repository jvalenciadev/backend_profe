import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';

export class CreateComunicadoDto {
    @IsOptional()
    @IsString()
    imagen?: string;

    @IsNotEmpty()
    @IsString()
    nombre: string;

    @IsNotEmpty()
    @IsString()
    descripcion: string;

    @IsOptional()
    @IsString()
    importancia?: string;

    @IsOptional()
    @IsString()
    estado?: string;

    @IsOptional()
    @IsString()
    tipo?: string;

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}
