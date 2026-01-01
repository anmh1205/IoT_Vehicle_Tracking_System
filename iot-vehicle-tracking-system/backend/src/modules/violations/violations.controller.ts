import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ViolationsService } from './violations.service';
import { CreateViolationDto } from './dto/create-violation.dto';
import { QueryViolationDto } from './dto/query-violation.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('violations')
@Controller('violations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new violation' })
  @ApiResponse({
    status: 201,
    description: 'Violation created successfully',
  })
  create(@Body() createViolationDto: CreateViolationDto) {
    return this.violationsService.create(createViolationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all violations with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of violations',
  })
  findAll(@Query() queryDto: QueryViolationDto) {
    return this.violationsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get violation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Violation details',
  })
  @ApiResponse({
    status: 404,
    description: 'Violation not found',
  })
  findOne(@Param('id') id: string) {
    return this.violationsService.findOne(+id);
  }
}

