import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';

@Entity('devices')
@Index(['deviceId'], { unique: true })
@Index(['vehicleId'])
@Index(['status'])
@Index(['lastSeen'])
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_id', unique: true, length: 50 })
  deviceId: string;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: number | null;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;

  @Column({ name: 'device_type', length: 50, default: 'tracker' })
  deviceType: string;

  @Column({ name: 'firmware_version', nullable: true, length: 20 })
  firmwareVersion: string | null;

  @Column({ name: 'hardware_version', nullable: true, length: 20 })
  hardwareVersion: string | null;

  @Column({ unique: true, nullable: true, length: 20 })
  imei: string | null;

  @Column({ name: 'sim_card_number', nullable: true, length: 20 })
  simCardNumber: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: string;

  @Column({ name: 'last_seen', type: 'timestamp', nullable: true })
  lastSeen: Date | null;

  @Column({
    name: 'battery_level',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  batteryLevel: number | null;

  @Column({ name: 'signal_strength', type: 'int', nullable: true })
  signalStrength: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

