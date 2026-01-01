import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Username',
    example: 'staff01',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({
    description: 'Email address',
    example: 'staff01@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (will be hashed with SHA-256 on frontend)',
    example: 'hashed_password_string',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;

  @ApiProperty({
    description: 'Full name',
    example: 'Staff User',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '0123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'User role',
    enum: ['admin', 'staff', 'user'],
    example: 'staff',
    required: false,
  })
  @IsEnum(['admin', 'staff', 'user'])
  @IsOptional()
  role?: 'admin' | 'staff' | 'user';
}

