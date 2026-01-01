import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../modules/auth/entities/user.entity';

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({
    where: [{ username: 'admin' }, { email: 'admin@example.com' }],
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed...');
    return;
  }

  // Create default admin user
  // Password: admin123 (will be hashed with SHA-256 on frontend, then bcrypt here)
  // For seeding, we'll hash a placeholder that matches the expected format
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = userRepository.create({
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: passwordHash,
    fullName: 'System Administrator',
    role: 'admin',
    status: 'active',
  });

  await userRepository.save(admin);
  console.log('✅ Admin user created successfully');
  console.log('   Username: admin');
  console.log('   Email: admin@example.com');
  console.log('   Password: admin123 (please change after first login)');
}

