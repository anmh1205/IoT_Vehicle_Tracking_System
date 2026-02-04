import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { QueryTripDto } from './dto/trip.dto';

@Injectable()
export class TripsService {
    constructor(
        @InjectRepository(Trip)
        private readonly tripRepository: Repository<Trip>,
    ) { }

    async findAll(query: QueryTripDto) {
        const { page = 1, limit = 10, vehicleId, customerId, status, startDate, endDate } = query;

        const queryBuilder = this.tripRepository
            .createQueryBuilder('trip')
            .leftJoinAndSelect('trip.vehicle', 'vehicle')
            .leftJoinAndSelect('trip.customer', 'customer');

        if (vehicleId) {
            queryBuilder.andWhere('trip.vehicleId = :vehicleId', { vehicleId });
        }

        if (customerId) {
            queryBuilder.andWhere('trip.customerId = :customerId', { customerId });
        }

        if (status) {
            queryBuilder.andWhere('trip.status = :status', { status });
        }

        if (startDate && endDate) {
            queryBuilder.andWhere('trip.startTime BETWEEN :startDate AND :endDate', {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });
        } else if (startDate) {
            queryBuilder.andWhere('trip.startTime >= :startDate', { startDate: new Date(startDate) });
        } else if (endDate) {
            queryBuilder.andWhere('trip.startTime <= :endDate', { endDate: new Date(endDate) });
        }

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        queryBuilder.orderBy('trip.startTime', 'DESC');

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: number): Promise<Trip> {
        const trip = await this.tripRepository.findOne({
            where: { id },
            relations: ['vehicle', 'customer'],
        });
        if (!trip) {
            throw new NotFoundException(`Trip with ID ${id} not found`);
        }
        return trip;
    }

    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const total = await this.tripRepository.count();
        const todayTrips = await this.tripRepository.count({
            where: { startTime: MoreThanOrEqual(today) },
        });
        const inProgress = await this.tripRepository.count({
            where: { status: 'in_progress' as any },
        });

        return { total, todayTrips, inProgress };
    }
}
