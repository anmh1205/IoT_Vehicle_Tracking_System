import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  fullName?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ enum: ['admin', 'manager', 'staff', 'user'] })
  role: UserRole;
}

export class SessionResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresAt: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: SessionResponseDto })
  session: SessionResponseDto;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresAt: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  refreshToken: string;
}

