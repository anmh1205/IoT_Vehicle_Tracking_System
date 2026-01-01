import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';

@Entity('customers')
@Index(['phone'])
@Index(['idCardNumber'], { unique: true })
@Index(['status'])
@Index(['verificationStatus'])
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ nullable: true, length: 100 })
  email: string | null;

  @Column({ length: 20 })
  phone: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ name: 'id_card_number', unique: true, nullable: true, length: 20 })
  idCardNumber: string | null;

  @Column({ name: 'id_card_issue_date', type: 'date', nullable: true })
  idCardIssueDate: Date | null;

  @Column({ name: 'id_card_issue_place', nullable: true, length: 200 })
  idCardIssuePlace: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'license_number', nullable: true, length: 50 })
  licenseNumber: string | null;

  @Column({ name: 'license_type', nullable: true, length: 20 })
  licenseType: string | null;

  @Column({ name: 'license_issue_date', type: 'date', nullable: true })
  licenseIssueDate: Date | null;

  @Column({ name: 'license_expiry_date', type: 'date', nullable: true })
  licenseExpiryDate: Date | null;

  @Column({ name: 'license_issue_place', nullable: true, length: 200 })
  licenseIssuePlace: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: string;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  verificationStatus: string;

  @Column({ name: 'verified_by', nullable: true })
  verifiedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier: User | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'total_rentals', type: 'int', default: 0 })
  totalRentals: number;

  @Column({
    name: 'total_spent',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalSpent: number;

  @Column({
    name: 'rating_average',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  ratingAverage: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

