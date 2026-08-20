import { IsString, IsEmail, IsEnum, IsOptional, IsInt, MinLength } from 'class-validator';
import { Role, StatutCompte } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateUtilisateurDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  motDePasse: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsEnum(StatutCompte)
  @IsOptional()
  statut?: StatutCompte;

  @IsInt()
  @IsOptional()
  agentId?: number;
}

export class UpdateUtilisateurDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  motDePasse?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsEnum(StatutCompte)
  @IsOptional()
  statut?: StatutCompte;

  @IsInt()
  @IsOptional()
  agentId?: number;
}

export class UtilisateursQueryDto extends PaginationQueryDto {}
