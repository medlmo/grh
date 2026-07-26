import { IsOptional, IsString, IsDateString, IsInt, IsEnum, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgentDto {
  @IsString()
  matricule: string;

  @IsString()
  cin: string;

  @IsString()
  nomFr: string;

  @IsOptional() @IsString()
  nomAr?: string;

  @IsString()
  prenomFr: string;

  @IsOptional() @IsString()
  prenomAr?: string;

  @IsDateString()
  dateNaissance: string;

  @IsOptional() @IsString()
  lieuNaissanceFr?: string;

  @IsOptional() @IsString()
  sexe?: string;

  @IsOptional() @IsString()
  nationalite?: string;

  @IsOptional() @IsString()
  situationFamiliale?: string;

  @IsOptional() @IsInt()
  nbEnfants?: number;

  @IsOptional() @IsString()
  telephone?: string;

  @IsOptional() @IsString()
  email?: string;

  @IsEnum(['TITULAIRE', 'STAGIAIRE', 'CONTRACTUEL', 'JOURNALIER'])
  statut: any;

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
  echelleId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  echelonId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  indice?: number;

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

export class UpdateAgentDto extends CreateAgentDto {}
