import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    @Roles('admin', 'manager', 'staff')
    @ApiOperation({ summary: 'Create a new customer' })
    async create(@Body() createCustomerDto: CreateCustomerDto) {
        return this.customersService.create(createCustomerDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all customers' })
    async findAll(@Query() query: QueryCustomerDto) {
        return this.customersService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get customer by ID' })
    async findOne(@Param('id') id: string) {
        return this.customersService.findOne(+id);
    }

    @Put(':id')
    @Roles('admin', 'manager', 'staff')
    @ApiOperation({ summary: 'Update customer' })
    async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
        return this.customersService.update(+id, updateCustomerDto);
    }

    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete customer' })
    async remove(@Param('id') id: string) {
        return this.customersService.remove(+id);
    }
}
