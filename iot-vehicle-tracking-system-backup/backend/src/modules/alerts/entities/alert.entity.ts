import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Device } from '../../devices/entities/device.entity';

export enum AlertType {
    MOTION_DETECTED = 'motion_detected',
    LOW_BATTERY = 'low_battery',
    GEOFENCE_EXIT = 'geofence_exit',
    GEOFENCE_ENTRY = 'geofence_entry',
    SPEEDING = 'speeding',
    IGNITION_ON = 'ignition_on',
    IGNITION_OFF = 'ignition_off',
    UNAUTHORIZED_MOVEMENT = 'unauthorized_movement',
    DEVICE_OFFLINE = 'device_offline',
}

export enum AlertSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

@Entity('alerts')
export class Alert {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'vehicle_id' })
    vehicleId: number;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @Column({ name: 'device_id', nullable: true })
    deviceId: number;

    @ManyToOne(() => Device, { nullable: true })
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @Column({ name: 'alert_type', type: 'enum', enum: AlertType })
    @Index()
    alertType: AlertType;

    @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.MEDIUM })
    @Index()
    severity: AlertSeverity;

    @Column({ length: 200, nullable: true })
    title: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ name: 'location_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
    locationLat: number;

    @Column({ name: 'location_lon', type: 'decimal', precision: 11, scale: 8, nullable: true })
    locationLon: number;

    @Column({ default: false })
    @Index()
    acknowledged: boolean;

    @Column({ name: 'acknowledged_at', nullable: true })
    acknowledgedAt: Date;

    @Column({ default: false })
    resolved: boolean;

    @Column({ name: 'resolved_at', nullable: true })
    resolvedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;
}
