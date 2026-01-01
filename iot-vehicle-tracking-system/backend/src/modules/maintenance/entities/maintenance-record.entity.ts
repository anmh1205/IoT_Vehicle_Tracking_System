import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';

@Entity('maintenance_records')
@Index(['vehicleId'])
@Index(['nextMaintenanceDate'])
export class MaintenanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_id' })
  vehicleId: number;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'maintenance_type', length: 50 })
  maintenanceType: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  cost: number | null;

  @Column({ name: 'mileage_km', type: 'int', nullable: true })
  mileageKm: number | null;

  @Column({ name: 'performed_by', type: 'varchar', nullable: true, length: 100 })
  performedBy: string | null;

  @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
  nextMaintenanceDate: Date | null;

  @Column({ name: 'next_maintenance_mileage', type: 'int', nullable: true })
  nextMaintenanceMileage: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

