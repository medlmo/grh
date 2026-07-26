import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  motDePasse: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  ancienMotDePasse: string;

  @IsString()
  @MinLength(6)
  nouveauMotDePasse: string;
}
