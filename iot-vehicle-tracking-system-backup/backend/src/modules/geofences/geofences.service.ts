import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Geofence } from './entities/geofence.entity';

@Injectable()
export class GeofencesService {
    constructor(
        @InjectRepository(Geofence)
        private readonly geofenceRepository: Repository<Geofence>,
    ) { }

    async create(data: Partial<Geofence>): Promise<Geofence> {
        const geofence = this.geofenceRepository.create(data);
        return this.geofenceRepository.save(geofence);
    }

    async findAll(query: { page?: number; limit?: number }) {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;
        const [data, total] = await this.geofenceRepository.findAndCount({
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: number): Promise<Geofence> {
        const geofence = await this.geofenceRepository.findOne({ where: { id } });
        if (!geofence) throw new NotFoundException(`Geofence with ID ${id} not found`);
        return geofence;
    }

    async update(id: number, data: Partial<Geofence>): Promise<Geofence> {
        const geofence = await this.findOne(id);
        Object.assign(geofence, data);
        return this.geofenceRepository.save(geofence);
    }

    async remove(id: number): Promise<void> {
        const geofence = await this.findOne(id);
        await this.geofenceRepository.remove(geofence);
    }
}
