import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TypeConge } from '@prisma/client';

export class CreateCongeDto {
  @Type(() => Number)
  @IsNumber()
  agentId: number;

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
