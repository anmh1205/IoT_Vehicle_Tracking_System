import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
// import { Device } from '@/modules/devices/entities/device.entity';

@Entity('vehicles')
@Index(['vehicleId'], { unique: true })
@Index(['plateNumber'])
@Index(['status'])
@Index(['availabilityStatus'])
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_id', unique: true, length: 50 })
  vehicleId: string;

  @Column({ name: 'plate_number', length: 20 })
  plateNumber: string;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  brand: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  model: string | null;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  color: string | null;

  @Column({ name: 'vehicle_type', type: 'varchar', nullable: true, length: 50 })
  vehicleType: string | null;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  vin: string | null;

  @Column({ type: 'int', nullable: true })
  seats: number | null;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  transmission: string | null;

  @Column({ name: 'fuel_type', type: 'varchar', nullable: true, length: 50 })
  fuelType: string | null;

  @Column({ name: 'mileage_km', type: 'decimal', precision: 10, scale: 2, default: 0 })
  mileageKm: number;

  @Column({ name: 'registration_number', type: 'varchar', nullable: true, length: 100 })
  registrationNumber: string | null;

  @Column({ name: 'insurance_expiry', type: 'date', nullable: true })
  insuranceExpiry: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: 'Vehicle status: active, inactive, maintenance, retired',
  })
  status: string;

  // [Phase 2] Rental pricing fields
  @Column({
    name: 'rental_price_per_day',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  rentalPricePerDay: number | null;

  @Column({
    name: 'rental_price_per_hour',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  rentalPricePerHour: number | null;

  @Column({
    name: 'deposit_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  depositAmount: number | null;

  @Column({
    name: 'availability_status',
    type: 'varchar',
    length: 20,
    default: 'available',
    comment: 'Availability status: available, rented, maintenance, reserved, inactive',
  })
  availabilityStatus: string;

  @Column({ name: 'owner_id', type: 'int', nullable: true })
  ownerId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  // @OneToOne(() => Device, (device) => device.vehicle, { nullable: true })
  // @JoinColumn({ name: 'device_id' })
  // device: Device | null;

  @Column({ name: 'device_id', type: 'int', nullable: true })
  deviceId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations - ManyToMany with Geofence commented out due to circular dependency
  // TODO: Fix circular dependency by moving to GeofencesModule or using forwardRef
  // @ManyToMany(() => require('../../geofences/entities/geofence.entity').Geofence, (geofence: any) => geofence.vehicles)
  // @JoinTable({
  //   name: 'vehicle_geofences',
  //   joinColumn: { name: 'vehicle_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'geofence_id', referencedColumnName: 'id' },
  // })
  // geofences: any[];
}
