import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  IsUrl,
  IsInt,
  IsBooleanString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { StatutDemande, TypeConge } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateCongeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agentId?: number;

  @IsEnum(TypeConge)
  type: TypeConge;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motif?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adresseCongeFr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adresseCongeAr?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  justificatifUrl?: string;
}

export class ValiderCongeDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentaire?: string;
}

export class RefuserCongeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  motifRefus: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentaire?: string;
}

export class CongesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBooleanString()
  mine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agentId?: number;

  @IsOptional()
  @IsEnum(StatutDemande)
  statut?: StatutDemande;

  @IsOptional()
  @IsEnum(TypeConge)
  type?: TypeConge;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  structureId?: number;

  @IsOptional()
  @IsDateString()
  debut?: string;

  @IsOptional()
  @IsDateString()
  fin?: string;
}

export class CalendrierQueryDto extends PaginationQueryDto {
  @IsDateString()
  debut: string;

  @IsDateString()
  fin: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  structureId?: number;

  @IsOptional()
  @IsEnum(TypeConge)
  type?: TypeConge;
}
