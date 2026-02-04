import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { email, password } = loginDto;

        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        user.lastLogin = new Date();
        await this.userRepository.save(user);

        return this.generateTokens(user);
    }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { username, email, password, fullName, phone } = registerDto;

        // Check if user exists
        const existingUser = await this.userRepository.findOne({
            where: [{ email }, { username }],
        });

        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = this.userRepository.create({
            username,
            email,
            passwordHash,
            fullName,
            phone,
            role: UserRole.STAFF,
        });

        await this.userRepository.save(user);
        this.logger.log(`User registered: ${email}`);

        return this.generateTokens(user);
    }

    async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
            });

            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
            });

            if (!user) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            return this.generateTokens(user);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.userRepository.findOne({ where: { email } });

        if (user && (await bcrypt.compare(password, user.passwordHash))) {
            return user;
        }

        return null;
    }

    async getProfile(userId: number): Promise<Omit<User, 'passwordHash'>> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...result } = user;
        return result;
    }

    private generateTokens(user: User): AuthResponseDto {
        const payload = { sub: user.id, email: user.email, role: user.role };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
        };
    }

    // Seed initial admin user
    async seedAdminUser(): Promise<void> {
        const adminEmail = 'admin@example.com';
        const existingAdmin = await this.userRepository.findOne({
            where: { email: adminEmail },
        });

        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('admin123', salt);

            const admin = this.userRepository.create({
                username: 'admin',
                email: adminEmail,
                passwordHash,
                fullName: 'System Administrator',
                role: UserRole.ADMIN,
            });

            await this.userRepository.save(admin);
            this.logger.log('Admin user seeded: admin@example.com / admin123');
        }
    }
}
