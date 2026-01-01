import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Geofence } from './entities/geofence.entity';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { AssignVehiclesDto } from './dto/assign-vehicles.dto';
import { VehiclesService } from '@/modules/vehicles/vehicles.service';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class GeofencesService {
  private readonly logger = createLogger(GeofencesService.name);

  constructor(
    @InjectRepository(Geofence)
    private geofenceRepository: Repository<Geofence>,
    private vehiclesService: VehiclesService
  ) { }

  async findAll() {
    return this.geofenceRepository.find({
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const geofence = await this.geofenceRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!geofence) {
      throw new NotFoundException(`Geofence with ID ${id} not found`);
    }

    return geofence;
  }

  async create(createGeofenceDto: CreateGeofenceDto, createdBy?: number) {
    // Validate based on geofence type
    if (createGeofenceDto.geofenceType === 'circle') {
      if (
        !createGeofenceDto.centerLat ||
        !createGeofenceDto.centerLon ||
        !createGeofenceDto.radiusMeters
      ) {
        throw new BadRequestException(
          'Circle geofence requires centerLat, centerLon, and radiusMeters'
        );
      }
    } else if (createGeofenceDto.geofenceType === 'polygon') {
      if (!createGeofenceDto.coordinates || createGeofenceDto.coordinates.length < 3) {
        throw new BadRequestException(
          'Polygon geofence requires at least 3 coordinate points'
        );
      }
    }

    const geofence = this.geofenceRepository.create({
      ...createGeofenceDto,
      createdBy,
    });
    const savedGeofence = await this.geofenceRepository.save(geofence);

    this.logger.log(`Geofence ${savedGeofence.name} created`);

    return savedGeofence;
  }

  async update(id: number, updateGeofenceDto: UpdateGeofenceDto) {
    const geofence = await this.findOne(id);
    Object.assign(geofence, updateGeofenceDto);
    return this.geofenceRepository.save(geofence);
  }

  async remove(id: number) {
    const geofence = await this.findOne(id);
    await this.geofenceRepository.remove(geofence);

    this.logger.log(`Geofence ${geofence.name} deleted`);

    return { message: 'Geofence deleted successfully' };
  }

  // assignVehicles temporarily disabled - ManyToMany relation commented out
  async assignVehicles(id: number, assignDto: AssignVehiclesDto) {
    throw new BadRequestException('Vehicle assignment feature is temporarily disabled');
  }
}

