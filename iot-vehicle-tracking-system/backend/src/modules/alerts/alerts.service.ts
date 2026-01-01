import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class AlertsService {
  private readonly logger = createLogger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>
  ) {}

  async findAll(queryDto: QueryAlertDto) {
    const {
      page = 1,
      limit = 20,
      vehicleId,
      alertType,
      severity,
      acknowledged,
      resolved,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.alertRepository.createQueryBuilder('alert');

    if (vehicleId) {
      queryBuilder.andWhere('alert.vehicleId = :vehicleId', { vehicleId });
    }

    if (alertType) {
      queryBuilder.andWhere('alert.alertType = :alertType', { alertType });
    }

    if (severity) {
      queryBuilder.andWhere('alert.severity = :severity', { severity });
    }

    if (acknowledged !== undefined) {
      queryBuilder.andWhere('alert.acknowledged = :acknowledged', {
        acknowledged,
      });
    }

    if (resolved !== undefined) {
      queryBuilder.andWhere('alert.resolved = :resolved', { resolved });
    }

    const total = await queryBuilder.getCount();

    const alerts = await queryBuilder
      .leftJoinAndSelect('alert.vehicle', 'vehicle')
      .leftJoinAndSelect('alert.device', 'device')
      .leftJoinAndSelect('alert.acknowledger', 'acknowledger')
      .leftJoinAndSelect('alert.resolver', 'resolver')
      .skip(skip)
      .take(limit)
      .orderBy('alert.createdAt', 'DESC')
      .getMany();

    return {
      data: alerts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['vehicle', 'device', 'acknowledger', 'resolver'],
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return alert;
  }

  async create(createAlertDto: CreateAlertDto) {
    const alert = this.alertRepository.create(createAlertDto);
    const savedAlert = await this.alertRepository.save(alert);

    this.logger.log(`Alert ${savedAlert.alertType} created for vehicle ${savedAlert.vehicleId}`);

    return savedAlert;
  }

  async acknowledge(id: number, userId: number) {
    const alert = await this.findOne(id);
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    return this.alertRepository.save(alert);
  }

  async resolve(id: number, userId: number) {
    const alert = await this.findOne(id);
    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;

    return this.alertRepository.save(alert);
  }
}

