import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { CreateDeviceDto, UpdateDeviceDto, QueryDeviceDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
    ) { }

    async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
        const existing = await this.deviceRepository.findOne({
            where: { deviceId: createDeviceDto.deviceId },
        });

        if (existing) {
            throw new ConflictException('Device with this ID already exists');
        }

        const device = this.deviceRepository.create(createDeviceDto);
        return this.deviceRepository.save(device);
    }

    async findAll(query: QueryDeviceDto) {
        const { page = 1, limit = 10, search, status, vehicleId } = query;

        const queryBuilder = this.deviceRepository
            .createQueryBuilder('device')
            .leftJoinAndSelect('device.vehicle', 'vehicle');

        if (status) {
            queryBuilder.andWhere('device.status = :status', { status });
        }

        if (vehicleId) {
            queryBuilder.andWhere('device.vehicleId = :vehicleId', { vehicleId });
        }

        if (search) {
            queryBuilder.andWhere('(device.deviceId ILIKE :search OR device.imei ILIKE :search)', {
                search: `%${search}%`,
            });
        }

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        queryBuilder.orderBy('device.createdAt', 'DESC');

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: number): Promise<Device> {
        const device = await this.deviceRepository.findOne({
            where: { id },
            relations: ['vehicle'],
        });

        if (!device) {
            throw new NotFoundException(`Device with ID ${id} not found`);
        }

        return device;
    }

    async update(id: number, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
        const device = await this.findOne(id);
        Object.assign(device, updateDeviceDto);
        return this.deviceRepository.save(device);
    }

    async remove(id: number): Promise<void> {
        const device = await this.findOne(id);
        await this.deviceRepository.remove(device);
    }

    async updateLastSeen(deviceId: string): Promise<void> {
        await this.deviceRepository.update({ deviceId }, { lastSeen: new Date() });
    }
}
