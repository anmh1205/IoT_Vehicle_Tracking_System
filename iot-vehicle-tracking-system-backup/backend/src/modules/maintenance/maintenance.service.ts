import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maintenance } from './entities/maintenance.entity';

@Injectable()
export class MaintenanceService {
    constructor(
        @InjectRepository(Maintenance)
        private readonly maintenanceRepository: Repository<Maintenance>,
    ) { }

    async create(data: Partial<Maintenance>): Promise<Maintenance> {
        const maintenance = this.maintenanceRepository.create(data);
        return this.maintenanceRepository.save(maintenance);
    }

    async findAll(query: { page?: number; limit?: number; vehicleId?: number }) {
        const { page = 1, limit = 10, vehicleId } = query;
        const queryBuilder = this.maintenanceRepository
            .createQueryBuilder('maintenance')
            .leftJoinAndSelect('maintenance.vehicle', 'vehicle');

        if (vehicleId) queryBuilder.andWhere('maintenance.vehicleId = :vehicleId', { vehicleId });

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit).orderBy('maintenance.createdAt', 'DESC');
        const [data, total] = await queryBuilder.getManyAndCount();
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: number): Promise<Maintenance> {
        const maintenance = await this.maintenanceRepository.findOne({ where: { id }, relations: ['vehicle'] });
        if (!maintenance) throw new NotFoundException(`Maintenance with ID ${id} not found`);
        return maintenance;
    }

    async update(id: number, data: Partial<Maintenance>): Promise<Maintenance> {
        const maintenance = await this.findOne(id);
        Object.assign(maintenance, data);
        return this.maintenanceRepository.save(maintenance);
    }

    async remove(id: number): Promise<void> {
        const maintenance = await this.findOne(id);
        await this.maintenanceRepository.remove(maintenance);
    }
}
