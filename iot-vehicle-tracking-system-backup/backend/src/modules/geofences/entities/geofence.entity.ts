import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum GeofenceType {
    CIRCLE = 'circle',
    POLYGON = 'polygon',
    RECTANGLE = 'rectangle',
}

@Entity('geofences')
export class Geofence {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'geofence_type', type: 'enum', enum: GeofenceType, default: GeofenceType.CIRCLE })
    geofenceType: GeofenceType;

    @Column({ name: 'center_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
    centerLat: number;

    @Column({ name: 'center_lon', type: 'decimal', precision: 11, scale: 8, nullable: true })
    centerLon: number;

    @Column({ name: 'radius_meters', nullable: true })
    radiusMeters: number;

    @Column({ type: 'jsonb', nullable: true })
    coordinates: number[][];

    @Column({ name: 'alert_on_entry', default: false })
    alertOnEntry: boolean;

    @Column({ name: 'alert_on_exit', default: true })
    alertOnExit: boolean;

    @Column({ default: true })
    @Index()
    enabled: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
