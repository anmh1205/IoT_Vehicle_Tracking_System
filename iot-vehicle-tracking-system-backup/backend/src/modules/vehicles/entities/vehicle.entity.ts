import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum VehicleStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    MAINTENANCE = 'maintenance',
    RETIRED = 'retired',
}

export enum VehicleType {
    SEDAN = 'sedan',
    SUV = 'suv',
    HATCHBACK = 'hatchback',
    COUPE = 'coupe',
    PICKUP = 'pickup',
    VAN = 'van',
    TRUCK = 'truck',
}

export enum Transmission {
    MANUAL = 'manual',
    AUTOMATIC = 'automatic',
}

export enum FuelType {
    GASOLINE = 'gasoline',
    DIESEL = 'diesel',
    HYBRID = 'hybrid',
    ELECTRIC = 'electric',
}

@Entity('vehicles')
export class Vehicle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'vehicle_id', unique: true, length: 50 })
    @Index()
    vehicleId: string;

    @Column({ name: 'plate_number', unique: true, length: 20, nullable: true })
    @Index()
    plateNumber: string;

    @Column({ name: 'owner_id', nullable: true })
    ownerId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Column({
        name: 'vehicle_type',
        type: 'enum',
        enum: VehicleType,
        nullable: true,
    })
    @Index()
    vehicleType: VehicleType;

    @Column({ length: 50, nullable: true })
    brand: string;

    @Column({ length: 50, nullable: true })
    model: string;

    @Column({ nullable: true })
    year: number;

    @Column({ length: 30, nullable: true })
    color: string;

    @Column({ length: 50, nullable: true })
    vin: string;

    @Column({ default: 5 })
    seats: number;

    @Column({
        type: 'enum',
        enum: Transmission,
        nullable: true,
    })
    transmission: Transmission;

    @Column({
        name: 'fuel_type',
        type: 'enum',
        enum: FuelType,
        nullable: true,
    })
    fuelType: FuelType;

    @Column({ name: 'mileage_km', default: 0 })
    mileageKm: number;

    @Column({ name: 'registration_number', length: 50, nullable: true })
    registrationNumber: string;

    @Column({ name: 'insurance_expiry', type: 'date', nullable: true })
    insuranceExpiry: Date;

    @Column({
        type: 'enum',
        enum: VehicleStatus,
        default: VehicleStatus.ACTIVE,
    })
    @Index()
    status: VehicleStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
