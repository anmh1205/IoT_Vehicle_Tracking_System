import { PartialType } from '@nestjs/swagger';
import { CreateTripDto } from './create-trip.dto';
import { IsOptional, IsDateString, IsNumber, IsInt, IsEnum } from 'class-validator';

export class UpdateTripDto extends PartialType(CreateTripDto) {
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  endLocationLat?: number;

  @IsOptional()
  @IsNumber()
  endLocationLon?: number;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  maxSpeed?: number;

  @IsOptional()
  @IsNumber()
  avgSpeed?: number;

  @IsOptional()
  @IsInt()
  mileageAtEnd?: number;

  @IsOptional()
  @IsEnum(['in_progress', 'completed', 'cancelled'])
  status?: string;
}

