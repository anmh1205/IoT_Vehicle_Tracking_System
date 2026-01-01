import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Username or email',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Password (will be hashed with SHA-256 on frontend)',
    example: 'hashed_password_string',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}

