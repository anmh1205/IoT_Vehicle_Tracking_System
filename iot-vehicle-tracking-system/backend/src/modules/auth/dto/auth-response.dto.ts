import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ enum: ['admin', 'staff', 'user'] })
  role: 'admin' | 'staff' | 'user';
}

export class SessionResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  expiresAt: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: SessionResponseDto })
  session: SessionResponseDto;
}

