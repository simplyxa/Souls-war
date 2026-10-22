import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'hero1' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'newhero', description: '3-20 chars: letters, digits, underscore' })
  @IsString()
  @Matches(/^[A-Za-z0-9_]{3,20}$/, {
    message: 'username must be 3-20 characters: letters, digits or underscore',
  })
  username: string;

  @ApiProperty({ example: 'secret123', minLength: 6, maxLength: 72 })
  @IsString()
  @Length(6, 72)
  password: string;

  @ApiPropertyOptional({ example: 'Грозный', description: 'Character name (defaults to username)' })
  @IsOptional()
  @IsString()
  @Length(3, 20)
  characterName?: string;
}
