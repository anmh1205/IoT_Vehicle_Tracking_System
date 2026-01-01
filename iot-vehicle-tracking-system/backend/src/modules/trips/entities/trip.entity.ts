import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { Customer } from '@/modules/customers/entities/customer.entity';

@Entity('trips')
@Index(['tripId'], { unique: true })
@Index(['vehicleId'])
@Index(['customerId'])
@Index(['startTime'])
@Index(['status'])
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'booking_id', type: 'int', nullable: true })
  bookingId: number | null;

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

  @Column({ name: 'trip_id', unique: true, length: 50 })
  tripId: string;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({
    name: 'start_location_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  startLocationLat: number | null;

  @Column({
    name: 'start_location_lon',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  startLocationLon: number | null;

  @Column({
    name: 'end_location_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  endLocationLat: number | null;

  @Column({
    name: 'end_location_lon',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  endLocationLon: number | null;

  @Column({
    name: 'distance_km',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  distanceKm: number | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({
    name: 'max_speed',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  maxSpeed: number | null;

  @Column({
    name: 'avg_speed',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  avgSpeed: number | null;

  @Column({ name: 'mileage_at_start', type: 'int', nullable: true })
  mileageAtStart: number | null;

  @Column({ name: 'mileage_at_end', type: 'int', nullable: true })
  mileageAtEnd: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'in_progress',
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

