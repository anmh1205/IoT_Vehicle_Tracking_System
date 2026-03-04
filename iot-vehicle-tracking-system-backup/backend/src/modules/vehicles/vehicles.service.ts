import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto, UpdateVehicleDto, QueryVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
    constructor(
        @InjectRepository(Vehicle)
        private readonly vehicleRepository: Repository<Vehicle>,
    ) { }

    async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
        // Check for duplicate vehicle ID or plate number
        const existing = await this.vehicleRepository.findOne({
            where: [
                { vehicleId: createVehicleDto.vehicleId },
                { plateNumber: createVehicleDto.plateNumber },
            ],
        });

        if (existing) {
            throw new ConflictException('Vehicle with this ID or plate number already exists');
        }

        const vehicle = this.vehicleRepository.create(createVehicleDto);
        return this.vehicleRepository.save(vehicle);
    }

    async findAll(query: QueryVehicleDto) {
        const { page = 1, limit = 10, search, status, vehicleType } = query;

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
                '(vehicle.plateNumber ILIKE :search OR vehicle.vehicleId ILIKE :search OR vehicle.brand ILIKE :search OR vehicle.model ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        // Pagination
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        // Order
        queryBuilder.orderBy('vehicle.createdAt', 'DESC');

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number): Promise<Vehicle> {
        const vehicle = await this.vehicleRepository.findOne({
            where: { id },
        });

        if (!vehicle) {
            throw new NotFoundException(`Vehicle with ID ${id} not found`);
        }

        return vehicle;
    }

    async findByVehicleId(vehicleId: string): Promise<Vehicle> {
        const vehicle = await this.vehicleRepository.findOne({
            where: { vehicleId },
        });

        if (!vehicle) {
            throw new NotFoundException(`Vehicle with vehicleId ${vehicleId} not found`);
        }

        return vehicle;
    }

    async update(id: number, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
        const vehicle = await this.findOne(id);

        // Check for duplicate plate number
        if (updateVehicleDto.plateNumber && updateVehicleDto.plateNumber !== vehicle.plateNumber) {
            const existing = await this.vehicleRepository.findOne({
                where: { plateNumber: updateVehicleDto.plateNumber },
            });

            if (existing) {
                throw new ConflictException('Vehicle with this plate number already exists');
            }
        }

        Object.assign(vehicle, updateVehicleDto);
        return this.vehicleRepository.save(vehicle);
    }

    async remove(id: number): Promise<void> {
        const vehicle = await this.findOne(id);
        await this.vehicleRepository.remove(vehicle);
    }

    async getStats() {
        const total = await this.vehicleRepository.count();
        const active = await this.vehicleRepository.count({ where: { status: 'active' as any } });
        const inactive = await this.vehicleRepository.count({ where: { status: 'inactive' as any } });
        const maintenance = await this.vehicleRepository.count({
            where: { status: 'maintenance' as any },
        });

        return {
            total,
            active,
            inactive,
            maintenance,
        };
    }
}
