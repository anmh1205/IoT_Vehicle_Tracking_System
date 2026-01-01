import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRecord } from './entities/maintenance-record.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class MaintenanceService {
  private readonly logger = createLogger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenanceRecord)
    private maintenanceRepository: Repository<MaintenanceRecord>
  ) {}

  async findAll(queryDto: QueryMaintenanceDto) {
    const { page = 1, limit = 20, vehicleId } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.maintenanceRepository.createQueryBuilder('maintenance');

    if (vehicleId) {
      queryBuilder.andWhere('maintenance.vehicleId = :vehicleId', {
        vehicleId,
      });
    }

    const total = await queryBuilder.getCount();

    const records = await queryBuilder
      .leftJoinAndSelect('maintenance.vehicle', 'vehicle')
      .skip(skip)
      .take(limit)
      .orderBy('maintenance.createdAt', 'DESC')
      .getMany();

    return {
      data: records,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const record = await this.maintenanceRepository.findOne({
      where: { id },
      relations: ['vehicle'],
    });

    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }

    return record;
  }

  async create(createMaintenanceDto: CreateMaintenanceDto) {
    const record = this.maintenanceRepository.create(createMaintenanceDto);
    const savedRecord = await this.maintenanceRepository.save(record);

    this.logger.log(
      `Maintenance record ${savedRecord.maintenanceType} created for vehicle ${savedRecord.vehicleId}`
    );

    return savedRecord;
  }

  async remove(id: number) {
    const record = await this.findOne(id);
    await this.maintenanceRepository.remove(record);

    this.logger.log(`Maintenance record ${id} deleted`);

    return { message: 'Maintenance record deleted successfully' };
  }
}

