import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Trip } from '@/modules/trips/entities/trip.entity';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { Customer } from '@/modules/customers/entities/customer.entity';
import { User } from '@/modules/auth/entities/user.entity';

@Entity('violations')
@Index(['tripId'])
@Index(['vehicleId'])
@Index(['customerId'])
@Index(['violationType'])
@Index(['violationTime'])
export class Violation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'booking_id', type: 'int', nullable: true })
  bookingId: number | null; // [Phase 2] Link to booking

  @Column({ name: 'trip_id', type: 'int', nullable: true })
  tripId: number | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip | null;

  @Column({ name: 'vehicle_id' })
  vehicleId: number;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId: number | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'violation_type', length: 50 })
  violationType: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'medium',
  })
  severity: string;

  @Column({
    name: 'speed_limit',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  speedLimit: number | null;

  @Column({
    name: 'actual_speed',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  actualSpeed: number | null;

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

  @Column({ name: 'violation_time', type: 'timestamp' })
  violationTime: Date;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'fine_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  fineAmount: number;

  @Column({ default: false })
  acknowledged: boolean;

  @Column({ name: 'acknowledged_by', nullable: true })
  acknowledgedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledger: User | null;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

