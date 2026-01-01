import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginResponseDto, UserResponseDto, TokenResponseDto } from './dto/auth-response.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class AuthService {
  private readonly logger = createLogger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async validateUser(username: string, passwordHash: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }],
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    // Compare hashed password (frontend sends SHA-256 hash)
    // We store bcrypt hash of the SHA-256 hash
    const isPasswordValid = await bcrypt.compare(passwordHash, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateUserById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, status: 'active' },
    });
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(payload);

    // Calculate expiration (7 days default)
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const expiresAt = new Date(Date.now() + expiresIn).toISOString();

    // Generate refresh token
    const refreshExpiresIn = this.configService.get<string>('auth.refreshExpiresIn') || '30d';
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: refreshExpiresIn }
    );

    // Update last login
    await this.userRepository.update(user.id, { lastLogin: new Date() });

    this.logger.log(`User ${user.username} logged in successfully`);

    return {
      user: this.toUserResponseDto(user),
      session: {
        token,
        refreshToken,
        expiresAt,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    // Check if username or email already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ username: registerDto.username }, { email: registerDto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash the password (which is already SHA-256 hashed from frontend)
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      username: registerDto.username,
      email: registerDto.email,
      passwordHash: hashedPassword,
      fullName: registerDto.fullName,
      phone: registerDto.phone,
      role: registerDto.role || 'staff',
      status: 'active',
    });

    const savedUser = await this.userRepository.save(user);

    this.logger.log(`New user ${savedUser.username} registered`);

    return this.toUserResponseDto(savedUser);
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.validateUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const newPayload = { sub: user.id, username: user.username, role: user.role };
      const accessToken = this.jwtService.sign(newPayload);

      // Generate new refresh token
      const refreshExpiresIn = this.configService.get<string>('auth.refreshExpiresIn') || '30d';
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: refreshExpiresIn }
      );

      const expiresIn = 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + expiresIn).toISOString();

      this.logger.log(`Token refreshed for user ${user.username}`);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    // In a production system, you would invalidate the refresh token here
    // For example, by adding it to a blacklist or removing from a whitelist
    this.logger.log(`User ${userId} logged out`);
    return { message: 'Logged out successfully' };
  }

  private toUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName ?? undefined,
      phone: user.phone ?? undefined,
      role: user.role,
    };
  }
}

