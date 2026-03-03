import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateProfeDto {
    @IsNotEmpty()
    @IsString()
    nombre: string;

    @IsOptional()
    @IsString()
    logoPrincipal?: string;

    @IsNotEmpty()
    @IsString()
    descripcion: string;

    @IsNotEmpty()
    @IsString()
    mision: string;

    @IsNotEmpty()
    @IsString()
    vision: string;

    @IsNotEmpty()
    @IsString()
    sobreNosotros: string;

    @IsNotEmpty()
    @IsString()
    actividad: string;

    @IsNotEmpty()
    @IsString()
    ubicacion: string;

    @IsOptional()
    @IsString()
    banner?: string;

    @IsOptional()
    @IsString()
    afiche?: string;

    @IsOptional()
    @IsString()
    convocatoria?: string;

    @IsOptional()
    @IsString()
    imagen?: string;

    @IsOptional()
    @IsString()
    correo?: string;

    @IsOptional()
    @IsString()
    celular?: string;

    @IsOptional()
    @IsString()
    telefono?: string;

    @IsOptional()
    @IsString()
    pagina?: string;

    @IsOptional()
    @IsString()
    facebook?: string;

    @IsOptional()
    @IsString()
    tiktok?: string;

    @IsOptional()
    @IsString()
    youtube?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    colorSecundario?: string;

    @IsOptional()
    @IsBoolean()
    mantenimiento?: boolean;

    @IsOptional()
    @IsString()
    estado?: string;
}
