import { IsOptional, IsString, IsDateString, IsInt, IsEnum, MaxLength, Min, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { StatutAgent, StatutCarriere } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateAgentDto {
  @IsString()
  @MaxLength(30)
  matricule: string;

  @IsString()
  @MaxLength(30)
  cin: string;

  @IsString()
  @MaxLength(100)
  nomFr: string;

  @IsOptional() @IsString()
  nomAr?: string;

  @IsString()
  @MaxLength(100)
  prenomFr: string;

  @IsOptional() @IsString()
  prenomAr?: string;

  @IsDateString()
  dateNaissance: string;

  @IsOptional() @IsString()
  lieuNaissanceFr?: string;

  @IsOptional() @IsString() @MaxLength(1)
  sexe?: string;

  @IsOptional() @IsString() @MaxLength(50)
  nationalite?: string;

  @IsOptional() @IsString() @MaxLength(50)
  situationFamiliale?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  nbEnfants?: number;

  @IsOptional() @IsString()
  telephone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsEnum(StatutAgent)
  statut: StatutAgent;

  @IsOptional()
  @IsEnum(StatutCarriere)
  statutCarriere?: StatutCarriere;

  @IsDateString()
  dateRecrutement: string;

  @IsOptional() @IsDateString()
  dateTitularisation?: string;

  @IsOptional() @IsDateString()
  dateFinContrat?: string;

  @Type(() => Number)
  @IsInt()
  corpsId: number;

  @IsOptional() @Type(() => Number) @IsInt()
  cadreId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  gradeId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  echelonId?: number;

  @IsOptional() @IsString()
  caisseRetraite?: string;

  @IsOptional() @IsString()
  matriculeRetraite?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  structureId?: number;

  @IsOptional() @IsString()
  fonctionFr?: string;

  @IsOptional() @IsString()
  fonctionAr?: string;
}

export class UpdateAgentDto {
  @IsOptional() @IsString() @MaxLength(30) matricule?: string;
  @IsOptional() @IsString() @MaxLength(30) cin?: string;
  @IsOptional() @IsString() @MaxLength(100) nomFr?: string;
  @IsOptional() @IsString() nomAr?: string;
  @IsOptional() @IsString() @MaxLength(100) prenomFr?: string;
  @IsOptional() @IsString() prenomAr?: string;
  @IsOptional() @IsDateString() dateNaissance?: string;
  @IsOptional() @IsString() lieuNaissanceFr?: string;
  @IsOptional() @IsString() @MaxLength(1) sexe?: string;
  @IsOptional() @IsString() @MaxLength(50) nationalite?: string;
  @IsOptional() @IsString() @MaxLength(50) situationFamiliale?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) nbEnfants?: number;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(StatutAgent) statut?: StatutAgent;
  @IsOptional() @IsEnum(StatutCarriere) statutCarriere?: StatutCarriere;
  @IsOptional() @IsDateString() dateRecrutement?: string;
  @IsOptional() @IsDateString() dateTitularisation?: string;
  @IsOptional() @IsDateString() dateFinContrat?: string;
  @IsOptional() @Type(() => Number) @IsInt() corpsId?: number;
  @IsOptional() @Type(() => Number) @IsInt() cadreId?: number;
  @IsOptional() @Type(() => Number) @IsInt() gradeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() echelonId?: number;
  @IsOptional() @IsString() caisseRetraite?: string;
  @IsOptional() @IsString() matriculeRetraite?: string;
  @IsOptional() @Type(() => Number) @IsInt() structureId?: number;
  @IsOptional() @IsString() fonctionFr?: string;
  @IsOptional() @IsString() fonctionAr?: string;
}

export class AgentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(StatutAgent)
  statut?: StatutAgent;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  structureId?: number;
}

export class CreateCarriereEventDto {
  @IsDateString()
  dateEffet: string;

  @IsString()
  @MaxLength(100)
  evenement: string;

  @IsOptional() @IsString() @MaxLength(2000)
  descriptionFr?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  descriptionAr?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  gradeAvantId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  gradeApresId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  echelonAvant?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  echelonApres?: number;
}

export class CreatePieceJointeDto {
  @IsString() @MaxLength(100)
  type: string;

  @IsString() @MaxLength(255)
  nomFichier: string;

  @IsString() @MaxLength(1000)
  chemin: string;

  @IsString() @MaxLength(100)
  mimeType: string;

  @Type(() => Number)
  @IsInt()
  taille: number;
}
