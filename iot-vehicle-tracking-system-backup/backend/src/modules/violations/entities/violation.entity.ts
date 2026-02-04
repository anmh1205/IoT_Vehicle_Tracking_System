import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

export enum ViolationType {
    SPEEDING = 'speeding',
    HARD_BRAKING = 'hard_braking',
    HARD_ACCELERATION = 'hard_acceleration',
    IDLE_TOO_LONG = 'idle_too_long',
    GEOFENCE_VIOLATION = 'geofence_violation',
    UNAUTHORIZED_AREA = 'unauthorized_area',
}

@Entity('violations')
export class Violation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'vehicle_id' })
    vehicleId: number;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @Column({ name: 'violation_type', type: 'enum', enum: ViolationType })
    @Index()
    violationType: ViolationType;

    @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
    severity: string;

    @Column({ name: 'speed_limit', type: 'decimal', precision: 5, scale: 2, nullable: true })
    speedLimit: number;

    @Column({ name: 'actual_speed', type: 'decimal', precision: 5, scale: 2, nullable: true })
    actualSpeed: number;

    @Column({ name: 'location_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
    locationLat: number;

    @Column({ name: 'location_lon', type: 'decimal', precision: 11, scale: 8, nullable: true })
    locationLon: number;

    @Column({ name: 'violation_time', type: 'timestamp' })
    @Index()
    violationTime: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: false })
    acknowledged: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
