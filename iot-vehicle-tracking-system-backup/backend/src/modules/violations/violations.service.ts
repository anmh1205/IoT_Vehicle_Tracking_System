import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Violation } from './entities/violation.entity';

@Injectable()
export class ViolationsService {
    constructor(
        @InjectRepository(Violation)
        private readonly violationRepository: Repository<Violation>,
    ) { }

    async findAll(query: { page?: number; limit?: number; vehicleId?: number; violationType?: string }) {
        const { page = 1, limit = 10, vehicleId, violationType } = query;

        const queryBuilder = this.violationRepository
            .createQueryBuilder('violation')
            .leftJoinAndSelect('violation.vehicle', 'vehicle');

        if (vehicleId) queryBuilder.andWhere('violation.vehicleId = :vehicleId', { vehicleId });
        if (violationType) queryBuilder.andWhere('violation.violationType = :violationType', { violationType });

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit).orderBy('violation.violationTime', 'DESC');

        const [data, total] = await queryBuilder.getManyAndCount();
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: number): Promise<Violation> {
        const violation = await this.violationRepository.findOne({ where: { id }, relations: ['vehicle'] });
        if (!violation) throw new NotFoundException(`Violation with ID ${id} not found`);
        return violation;
    }

    async acknowledge(id: number): Promise<Violation> {
        const violation = await this.findOne(id);
        violation.acknowledged = true;
        return this.violationRepository.save(violation);
    }
}
