import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDecisionDto {
  @IsString()
  type: string;

  @Type(() => Number)
  @IsNumber()
  agentId: number;

  @IsString()
  objetFr: string;

  @IsOptional() @IsString()
  objetAr?: string;

  @IsOptional() @IsString()
  contenuFr?: string;

  @IsOptional() @IsString()
  contenuAr?: string;

  @IsDateString()
  dateEffet: string;

  @IsOptional() @IsNumber()
  congeId?: number;
}

export class SignerDecisionDto {
  @IsOptional() @IsString()
  signataireNom?: string;
}
