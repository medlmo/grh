import { IsString, IsOptional, IsDateString, IsNumber, IsInt, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

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

export class DecisionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agentId?: number;
}
