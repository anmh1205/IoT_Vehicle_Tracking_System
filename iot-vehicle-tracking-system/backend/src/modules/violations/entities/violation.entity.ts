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

@Entity('violations')
@Index(['tripId'])
@Index(['vehicleId'])
@Index(['violationType'])
@Index(['violationTime'])
export class Violation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trip_id', nullable: true })
  tripId: number | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip | null;

  @Column({ name: 'vehicle_id' })
  vehicleId: number;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'violation_type', length: 50 })
  violationType: string;

  @Column({ name: 'violation_time', type: 'timestamp' })
  violationTime: Date;

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
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  severity: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

