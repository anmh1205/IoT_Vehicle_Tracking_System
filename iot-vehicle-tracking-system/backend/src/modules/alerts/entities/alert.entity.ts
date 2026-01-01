import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { Device } from '@/modules/devices/entities/device.entity';
import { User } from '@/modules/auth/entities/user.entity';

@Entity('alerts')
@Index(['vehicleId'])
@Index(['deviceId'])
@Index(['alertType'])
@Index(['severity'])
@Index(['acknowledged'])
@Index(['createdAt'])
export class Alert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: number | null;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;

  @Column({ name: 'booking_id', nullable: true })
  bookingId: number | null;

  @Column({ name: 'device_id', nullable: true })
  deviceId: number | null;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device: Device | null;

  @Column({ name: 'alert_type', length: 50 })
  alertType: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'medium',
  })
  severity: string;

  @Column({ nullable: true, length: 200 })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({
    name: 'location_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  locationLat: number | null;

  @Column({
    name: 'location_lon',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  locationLon: number | null;

  @Column({ default: false })
  acknowledged: boolean;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'acknowledged_by', nullable: true })
  acknowledgedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledger: User | null;

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

