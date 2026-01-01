import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Trip } from './trip.entity';

@Entity('trip_events')
@Index(['tripId'])
@Index(['eventTime'])
export class TripEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trip_id' })
  tripId: number;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'event_type', length: 50 })
  eventType: string;

  @Column({ name: 'event_time', type: 'timestamp' })
  eventTime: Date;

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
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  speed: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

