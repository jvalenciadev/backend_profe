import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateInscripcionDto {
    @IsUUID()
    personaId: string;

    @IsUUID()
    programaId: string;

    @IsUUID()
    turnoId: string;

    @IsUUID()
    sedeId: string;

    @IsOptional()
    @IsString()
    observacion?: string;

    // Additional fields for senior level
    @IsOptional()
    @IsString()
    documentoDigital?: string;

    @IsOptional()
    licenciatura?: string;

    @IsOptional()
    unidadEducativa?: string;
}
