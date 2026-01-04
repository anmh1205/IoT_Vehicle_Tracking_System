import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity';
import { QueryAlertDto } from './dto/alert.dto';

@Injectable()
export class AlertsService {
    constructor(
        @InjectRepository(Alert)
        private readonly alertRepository: Repository<Alert>,
    ) { }

    async findAll(query: QueryAlertDto) {
        const { page = 1, limit = 10, vehicleId, alertType, severity, acknowledged, resolved } = query;

        const queryBuilder = this.alertRepository
            .createQueryBuilder('alert')
            .leftJoinAndSelect('alert.vehicle', 'vehicle');

        if (vehicleId) queryBuilder.andWhere('alert.vehicleId = :vehicleId', { vehicleId });
        if (alertType) queryBuilder.andWhere('alert.alertType = :alertType', { alertType });
        if (severity) queryBuilder.andWhere('alert.severity = :severity', { severity });
        if (acknowledged !== undefined) queryBuilder.andWhere('alert.acknowledged = :acknowledged', { acknowledged });
        if (resolved !== undefined) queryBuilder.andWhere('alert.resolved = :resolved', { resolved });

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit).orderBy('alert.createdAt', 'DESC');

        const [data, total] = await queryBuilder.getManyAndCount();
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: number): Promise<Alert> {
        const alert = await this.alertRepository.findOne({ where: { id }, relations: ['vehicle'] });
        if (!alert) throw new NotFoundException(`Alert with ID ${id} not found`);
        return alert;
    }

    async acknowledge(id: number): Promise<Alert> {
        const alert = await this.findOne(id);
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date();
        return this.alertRepository.save(alert);
    }

    async resolve(id: number): Promise<Alert> {
        const alert = await this.findOne(id);
        alert.resolved = true;
        alert.resolvedAt = new Date();
        return this.alertRepository.save(alert);
    }

    async getStats() {
        const total = await this.alertRepository.count();
        const unacknowledged = await this.alertRepository.count({ where: { acknowledged: false } });
        const critical = await this.alertRepository.count({ where: { severity: 'critical' as any, resolved: false } });
        return { total, unacknowledged, critical };
    }
}
