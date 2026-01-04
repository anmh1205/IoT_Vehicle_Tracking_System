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
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

export enum DeviceStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    OFFLINE = 'offline',
    ERROR = 'error',
}

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'device_id', unique: true, length: 50 })
    @Index()
    deviceId: string;

    @Column({ name: 'vehicle_id', nullable: true })
    vehicleId: number;

    @ManyToOne(() => Vehicle, { nullable: true })
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @Column({ name: 'device_type', length: 50, default: 'tracker' })
    deviceType: string;

    @Column({ name: 'firmware_version', length: 20, nullable: true })
    firmwareVersion: string;

    @Column({ name: 'hardware_version', length: 20, nullable: true })
    hardwareVersion: string;

    @Column({ unique: true, length: 20, nullable: true })
    imei: string;

    @Column({ name: 'sim_card_number', length: 20, nullable: true })
    simCardNumber: string;

    @Column({
        type: 'enum',
        enum: DeviceStatus,
        default: DeviceStatus.ACTIVE,
    })
    @Index()
    status: DeviceStatus;

    @Column({ name: 'last_seen', nullable: true })
    @Index()
    lastSeen: Date;

    @Column({ name: 'battery_level', type: 'decimal', precision: 5, scale: 2, nullable: true })
    batteryLevel: number;

    @Column({ name: 'signal_strength', nullable: true })
    signalStrength: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
