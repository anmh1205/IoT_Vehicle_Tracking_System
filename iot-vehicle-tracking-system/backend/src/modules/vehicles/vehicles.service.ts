import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class VehiclesService {
  private readonly logger = createLogger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>
  ) {}

  async findAll(queryDto: QueryVehicleDto) {
    const { page = 1, limit = 20, status, vehicleType, search } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.vehicleRepository.createQueryBuilder('vehicle');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('vehicle.status = :status', { status });
    }

    if (vehicleType) {
      queryBuilder.andWhere('vehicle.vehicleType = :vehicleType', { vehicleType });
    }

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.plateNumber LIKE :search OR vehicle.brand LIKE :search OR vehicle.model LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const vehicles = await queryBuilder
      .leftJoinAndSelect('vehicle.owner', 'owner')
      .skip(skip)
      .take(limit)
      .orderBy('vehicle.createdAt', 'DESC')
      .getMany();

    return {
      data: vehicles,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return vehicle;
  }

  async findByVehicleId(vehicleId: string) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { vehicleId },
      relations: ['owner'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    return vehicle;
  }

  async create(createVehicleDto: CreateVehicleDto) {
    // Check if vehicle_id already exists
    const existingVehicle = await this.vehicleRepository.findOne({
      where: { vehicleId: createVehicleDto.vehicleId },
    });

    if (existingVehicle) {
      throw new ConflictException(
        `Vehicle with ID ${createVehicleDto.vehicleId} already exists`
      );
    }

    // Check if plate_number already exists
    const existingPlate = await this.vehicleRepository.findOne({
      where: { plateNumber: createVehicleDto.plateNumber },
    });

    if (existingPlate) {
      throw new ConflictException(
        `Vehicle with plate number ${createVehicleDto.plateNumber} already exists`
      );
    }

    const vehicle = this.vehicleRepository.create(createVehicleDto);
    const savedVehicle = await this.vehicleRepository.save(vehicle);

    this.logger.log(`Vehicle ${savedVehicle.vehicleId} created`);

    return savedVehicle;
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);

    // Check for conflicts if updating vehicle_id or plate_number
    if (updateVehicleDto.vehicleId && updateVehicleDto.vehicleId !== vehicle.vehicleId) {
      const existing = await this.vehicleRepository.findOne({
        where: { vehicleId: updateVehicleDto.vehicleId },
      });
      if (existing) {
        throw new ConflictException(
          `Vehicle with ID ${updateVehicleDto.vehicleId} already exists`
        );
      }
    }

    if (
      updateVehicleDto.plateNumber &&
      updateVehicleDto.plateNumber !== vehicle.plateNumber
    ) {
      const existing = await this.vehicleRepository.findOne({
        where: { plateNumber: updateVehicleDto.plateNumber },
      });
      if (existing) {
        throw new ConflictException(
          `Vehicle with plate number ${updateVehicleDto.plateNumber} already exists`
        );
      }
    }

    Object.assign(vehicle, updateVehicleDto);
    const updatedVehicle = await this.vehicleRepository.save(vehicle);

    this.logger.log(`Vehicle ${updatedVehicle.vehicleId} updated`);

    return updatedVehicle;
  }

  async remove(id: number) {
    const vehicle = await this.findOne(id);
    await this.vehicleRepository.remove(vehicle);

    this.logger.log(`Vehicle ${vehicle.vehicleId} deleted`);

    return { message: 'Vehicle deleted successfully' };
  }
}

