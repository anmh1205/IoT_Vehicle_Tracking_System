import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName: string | null;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: ['admin', 'staff', 'user'],
    default: 'staff',
  })
  role: 'admin' | 'staff' | 'user';

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  // @OneToMany(() => Vehicle, (vehicle) => vehicle.owner)
  // vehicles: Vehicle[];
}

