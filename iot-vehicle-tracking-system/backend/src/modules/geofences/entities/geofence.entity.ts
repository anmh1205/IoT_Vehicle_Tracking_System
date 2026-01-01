import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';

@Entity('geofences')
@Index(['enabled'])
export class Geofence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'geofence_type',
    type: 'varchar',
    length: 20,
    default: 'circle',
  })
  geofenceType: string;

  @Column({
    name: 'center_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  centerLat: number | null;

  @Column({
    name: 'center_lon',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  centerLon: number | null;

  @Column({ name: 'radius_meters', type: 'int', nullable: true })
  radiusMeters: number | null;

  @Column({ type: 'jsonb', nullable: true })
  coordinates: any | null;

  @Column({ name: 'alert_on_entry', default: false })
  alertOnEntry: boolean;

  @Column({ name: 'alert_on_exit', default: true })
  alertOnExit: boolean;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => require('@/modules/vehicles/entities/vehicle.entity').Vehicle, 'geofences')
  @JoinTable({
    name: 'vehicle_geofences',
    joinColumn: { name: 'geofence_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'vehicle_id', referencedColumnName: 'id' },
  })
  vehicles: any[];
}

