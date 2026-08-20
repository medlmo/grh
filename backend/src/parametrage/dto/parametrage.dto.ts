import { IsString, IsOptional, IsInt, IsBoolean, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AnneeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  annee?: number;
}

export class CreateCorpsDto {
  @IsString() code: string;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @IsOptional() @IsString() descriptionFr?: string;
  @IsOptional() @IsString() descriptionAr?: string;
}

export class UpdateCorpsDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelleFr?: string;
  @IsOptional() @IsString() libelleAr?: string;
  @IsOptional() @IsString() descriptionFr?: string;
  @IsOptional() @IsString() descriptionAr?: string;
}

export class CreateCadreDto {
  @IsString() code: string;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @IsOptional() @IsString() descriptionFr?: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @Type(() => Number) @IsInt() corpsId: number;
}

export class UpdateCadreDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelleFr?: string;
  @IsOptional() @IsString() libelleAr?: string;
  @IsOptional() @IsString() descriptionFr?: string;
  @IsOptional() @IsString() descriptionAr?: string;
}

export class CreateGradeDto {
  @IsString() code: string;
  @IsString() libelleFr: string;
  @IsString() libelleAr: string;
  @IsOptional() @IsString() descriptionFr?: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @Type(() => Number) @IsInt() cadreId: number;
}

export class UpdateGradeDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelleFr?: string;
  @IsOptional() @IsString() libelleAr?: string;
  @IsOptional() @IsString() descriptionFr?: string;
  @IsOptional() @IsString() descriptionAr?: string;
}

export class CreateEchelonDto {
  @Type(() => Number) @IsInt() gradeId: number;
  @Type(() => Number) @IsInt() numero: number;
  @IsOptional() @Type(() => Number) @IsInt() dureeMinMois?: number;
}

export class UpdateEchelonDto {
  @IsOptional() @Type(() => Number) @IsInt() numero?: number;
  @IsOptional() @Type(() => Number) @IsInt() dureeMinMois?: number;
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
