import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

@Entity('maintenance_records')
export class Maintenance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'vehicle_id' })
    vehicleId: number;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @Column({ name: 'maintenance_type', length: 50, nullable: true })
    maintenanceType: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    cost: number;

    @Column({ name: 'mileage_km', nullable: true })
    mileageKm: number;

    @Column({ name: 'performed_by', length: 100, nullable: true })
    performedBy: string;

    @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
    nextMaintenanceDate: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
