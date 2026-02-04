import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum CustomerStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    BLACKLISTED = 'blacklisted',
}

export enum VerificationStatus {
    PENDING = 'pending',
    VERIFIED = 'verified',
    REJECTED = 'rejected',
}

@Entity('customers')
export class Customer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'full_name', length: 100 })
    fullName: string;

    @Column({ length: 100, nullable: true })
    email: string;

    @Column({ length: 20 })
    @Index()
    phone: string;

    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth: Date;

    @Column({ name: 'id_card_number', unique: true, length: 20, nullable: true })
    @Index()
    idCardNumber: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ name: 'license_number', length: 50, nullable: true })
    licenseNumber: string;

    @Column({ name: 'license_type', length: 20, nullable: true })
    licenseType: string;

    @Column({ name: 'license_expiry_date', type: 'date', nullable: true })
    licenseExpiryDate: Date;

    @Column({
        type: 'enum',
        enum: CustomerStatus,
        default: CustomerStatus.ACTIVE,
    })
    @Index()
    status: CustomerStatus;

    @Column({
        name: 'verification_status',
        type: 'enum',
        enum: VerificationStatus,
        default: VerificationStatus.PENDING,
    })
    @Index()
    verificationStatus: VerificationStatus;

    @Column({ name: 'total_rentals', default: 0 })
    totalRentals: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
