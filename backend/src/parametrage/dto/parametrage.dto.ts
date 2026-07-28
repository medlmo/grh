import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCorpsDto {
  @IsString() code: string;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
}

export class CreateCadreDto {
  @IsString() code: string;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @Type(() => Number) @IsInt() corpsId: number;
}

export class CreateGradeDto {
  @IsString() code: string;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @Type(() => Number) @IsInt() cadreId: number;
}

export class CreateEchelleDto {
  @IsString() code: string;
  @Type(() => Number) @IsInt() numero: number;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @Type(() => Number) @IsInt() gradeId: number;
}

export class CreateEchelonDto {
  @Type(() => Number) @IsInt() echelleId: number;
  @Type(() => Number) @IsInt() numero: number;
  @Type(() => Number) @IsInt() indice: number;
  @Type(() => Number) @IsInt() dureeMinMois: number;
}

export class CreateJourFerieDto {
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @IsString() date: string;
  @IsOptional() @IsBoolean() estMobile?: boolean;
}

export class UpdateCollectiviteDto {
  @IsOptional() @IsString() nomFr?: string;
  @IsOptional() @IsString() nomAr?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() enteteFr?: string;
  @IsOptional() @IsString() enteteAr?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() email?: string;
}

export class CreateStructureDto {
  @IsString() code: string;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @Type(() => Number) @IsInt() parentId?: number;
}

export class UpdateStructureDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelleFr?: string;
  @IsOptional() @IsString() libelleAr?: string;
  @IsOptional() @IsString() type?: string;
  // parentId peut être null (pour mettre à la racine) — validé dans le service
  parentId?: number | null;
}