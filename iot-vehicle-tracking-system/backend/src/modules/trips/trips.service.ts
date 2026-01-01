import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { TripEvent } from './entities/trip-event.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class TripsService {
  private readonly logger = createLogger(TripsService.name);

  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(TripEvent)
    private tripEventRepository: Repository<TripEvent>
  ) {}

  async findAll(queryDto: QueryTripDto) {
    const {
      page = 1,
      limit = 20,
      vehicleId,
      customerId,
      status,
      startDate,
      endDate,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tripRepository.createQueryBuilder('trip');

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
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();

    const trips = await queryBuilder
      .leftJoinAndSelect('trip.vehicle', 'vehicle')
      .leftJoinAndSelect('trip.customer', 'customer')
      .skip(skip)
      .take(limit)
      .orderBy('trip.startTime', 'DESC')
      .getMany();

    return {
      data: trips,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: ['vehicle', 'customer'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    // Load events
    const events = await this.tripEventRepository.find({
      where: { tripId: id },
      order: { eventTime: 'ASC' },
    });

    return {
      ...trip,
      events,
    };
  }

  async create(createTripDto: CreateTripDto) {
    // Check if trip_id already exists
    const existingTrip = await this.tripRepository.findOne({
      where: { tripId: createTripDto.tripId },
    });

    if (existingTrip) {
      throw new ConflictException(
        `Trip with ID ${createTripDto.tripId} already exists`
      );
    }

    const trip = this.tripRepository.create({
      ...createTripDto,
      startTime: new Date(createTripDto.startTime),
    });
    const savedTrip = await this.tripRepository.save(trip);

    this.logger.log(`Trip ${savedTrip.tripId} created`);

    return savedTrip;
  }

  async update(id: number, updateTripDto: UpdateTripDto) {
    const trip = await this.findOne(id);

    if (updateTripDto.endTime) {
      updateTripDto.endTime = new Date(updateTripDto.endTime).toISOString();
    }

    Object.assign(trip, updateTripDto);
    const updatedTrip = await this.tripRepository.save(trip);

    this.logger.log(`Trip ${updatedTrip.tripId} updated`);

    return updatedTrip;
  }

  async remove(id: number) {
    const trip = await this.findOne(id);
    await this.tripRepository.remove(trip);

    this.logger.log(`Trip ${trip.tripId} deleted`);

    return { message: 'Trip deleted successfully' };
  }

  async addEvent(tripId: number, eventData: {
    eventType: string;
    eventTime: Date;
    locationLat?: number;
    locationLon?: number;
    speed?: number;
    description?: string;
  }) {
    const trip = await this.findOne(tripId);

    const event = this.tripEventRepository.create({
      tripId: trip.id,
      ...eventData,
    });

    return this.tripEventRepository.save(event);
  }
}

