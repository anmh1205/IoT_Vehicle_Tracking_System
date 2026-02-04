import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Customer } from '../../customers/entities/customer.entity';

export enum TripStatus {
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('trips')
export class Trip {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'trip_id', unique: true, length: 50 })
    @Index()
    tripId: string;

    @Column({ name: 'vehicle_id' })
    vehicleId: number;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @Column({ name: 'customer_id', nullable: true })
    customerId: number;

    @ManyToOne(() => Customer, { nullable: true })
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @Column({ name: 'start_time', type: 'timestamp' })
    @Index()
    startTime: Date;

    @Column({ name: 'end_time', type: 'timestamp', nullable: true })
    endTime: Date;

    @Column({ name: 'start_location_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
    startLocationLat: number;

    @Column({ name: 'start_location_lon', type: 'decimal', precision: 11, scale: 8, nullable: true })
    startLocationLon: number;

    @Column({ name: 'end_location_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
    endLocationLat: number;

    @Column({ name: 'end_location_lon', type: 'decimal', precision: 11, scale: 8, nullable: true })
    endLocationLon: number;

    @Column({ name: 'distance_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
    distanceKm: number;

    @Column({ name: 'duration_minutes', nullable: true })
    durationMinutes: number;

    @Column({ name: 'max_speed', type: 'decimal', precision: 5, scale: 2, nullable: true })
    maxSpeed: number;

    @Column({ name: 'avg_speed', type: 'decimal', precision: 5, scale: 2, nullable: true })
    avgSpeed: number;

    @Column({ type: 'enum', enum: TripStatus, default: TripStatus.IN_PROGRESS })
    @Index()
    status: TripStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
