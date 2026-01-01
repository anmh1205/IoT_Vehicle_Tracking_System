import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Violation } from './entities/violation.entity';
import { CreateViolationDto } from './dto/create-violation.dto';
import { QueryViolationDto } from './dto/query-violation.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class ViolationsService {
  private readonly logger = createLogger(ViolationsService.name);

  constructor(
    @InjectRepository(Violation)
    private violationRepository: Repository<Violation>
  ) {}

  async findAll(queryDto: QueryViolationDto) {
    const {
      page = 1,
      limit = 20,
      vehicleId,
      tripId,
      violationType,
      severity,
      startDate,
      endDate,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.violationRepository.createQueryBuilder('violation');

    if (vehicleId) {
      queryBuilder.andWhere('violation.vehicleId = :vehicleId', { vehicleId });
    }

    if (tripId) {
      queryBuilder.andWhere('violation.tripId = :tripId', { tripId });
    }

    if (violationType) {
      queryBuilder.andWhere('violation.violationType = :violationType', {
        violationType,
      });
    }

    if (severity) {
      queryBuilder.andWhere('violation.severity = :severity', { severity });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'violation.violationTime BETWEEN :startDate AND :endDate',
        { startDate, endDate }
      );
    }

    const total = await queryBuilder.getCount();

    const violations = await queryBuilder
      .leftJoinAndSelect('violation.vehicle', 'vehicle')
      .leftJoinAndSelect('violation.trip', 'trip')
      .skip(skip)
      .take(limit)
      .orderBy('violation.violationTime', 'DESC')
      .getMany();

    return {
      data: violations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const violation = await this.violationRepository.findOne({
      where: { id },
      relations: ['vehicle', 'trip'],
    });

    if (!violation) {
      throw new NotFoundException(`Violation with ID ${id} not found`);
    }

    return violation;
  }

  async create(createViolationDto: CreateViolationDto) {
    const violation = this.violationRepository.create({
      ...createViolationDto,
      violationTime: new Date(createViolationDto.violationTime),
    });
    const savedViolation = await this.violationRepository.save(violation);

    this.logger.log(
      `Violation ${savedViolation.violationType} created for vehicle ${savedViolation.vehicleId}`
    );

    return savedViolation;
  }
}

