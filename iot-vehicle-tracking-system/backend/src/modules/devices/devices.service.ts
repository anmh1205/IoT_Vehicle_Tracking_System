import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class DevicesService {
  private readonly logger = createLogger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>
  ) {}

  async findAll(queryDto: QueryDeviceDto) {
    const { page = 1, limit = 20, status, deviceType, search } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.deviceRepository.createQueryBuilder('device');

    if (status) {
      queryBuilder.andWhere('device.status = :status', { status });
    }

    if (deviceType) {
      queryBuilder.andWhere('device.deviceType = :deviceType', { deviceType });
    }

    if (search) {
      queryBuilder.andWhere(
        '(device.deviceId LIKE :search OR device.imei LIKE :search OR device.simCardNumber LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();

    const devices = await queryBuilder
      .leftJoinAndSelect('device.vehicle', 'vehicle')
      .skip(skip)
      .take(limit)
      .orderBy('device.createdAt', 'DESC')
      .getMany();

    return {
      data: devices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['vehicle'],
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return device;
  }

  async findByDeviceId(deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: { deviceId },
      relations: ['vehicle'],
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    return device;
  }

  async create(createDeviceDto: CreateDeviceDto) {
    // Check if device_id already exists
    const existingDevice = await this.deviceRepository.findOne({
      where: { deviceId: createDeviceDto.deviceId },
    });

    if (existingDevice) {
      throw new ConflictException(
        `Device with ID ${createDeviceDto.deviceId} already exists`
      );
    }

    // Check if IMEI already exists
    if (createDeviceDto.imei) {
      const existingImei = await this.deviceRepository.findOne({
        where: { imei: createDeviceDto.imei },
      });
      if (existingImei) {
        throw new ConflictException(
          `Device with IMEI ${createDeviceDto.imei} already exists`
        );
      }
    }

    const device = this.deviceRepository.create(createDeviceDto);
    const savedDevice = await this.deviceRepository.save(device);

    this.logger.log(`Device ${savedDevice.deviceId} created`);

    return savedDevice;
  }

  async update(id: number, updateDeviceDto: UpdateDeviceDto) {
    const device = await this.findOne(id);

    // Check for conflicts
    if (
      updateDeviceDto.deviceId &&
      updateDeviceDto.deviceId !== device.deviceId
    ) {
      const existing = await this.deviceRepository.findOne({
        where: { deviceId: updateDeviceDto.deviceId },
      });
      if (existing) {
        throw new ConflictException(
          `Device with ID ${updateDeviceDto.deviceId} already exists`
        );
      }
    }

    if (updateDeviceDto.imei && updateDeviceDto.imei !== device.imei) {
      const existing = await this.deviceRepository.findOne({
        where: { imei: updateDeviceDto.imei },
      });
      if (existing) {
        throw new ConflictException(
          `Device with IMEI ${updateDeviceDto.imei} already exists`
        );
      }
    }

    Object.assign(device, updateDeviceDto);
    const updatedDevice = await this.deviceRepository.save(device);

    this.logger.log(`Device ${updatedDevice.deviceId} updated`);

    return updatedDevice;
  }

  async remove(id: number) {
    const device = await this.findOne(id);
    await this.deviceRepository.remove(device);

    this.logger.log(`Device ${device.deviceId} deleted`);

    return { message: 'Device deleted successfully' };
  }

  async updateLastSeen(deviceId: string, data?: { batteryLevel?: number; signalStrength?: number }) {
    const device = await this.findByDeviceId(deviceId);
    device.lastSeen = new Date();
    if (data?.batteryLevel !== undefined) {
      device.batteryLevel = data.batteryLevel;
    }
    if (data?.signalStrength !== undefined) {
      device.signalStrength = data.signalStrength;
    }
    return this.deviceRepository.save(device);
  }
}

