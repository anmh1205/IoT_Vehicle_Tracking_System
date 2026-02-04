import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
    ) { }

    async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
        if (createCustomerDto.idCardNumber) {
            const existing = await this.customerRepository.findOne({
                where: { idCardNumber: createCustomerDto.idCardNumber },
            });
            if (existing) {
                throw new ConflictException('Customer with this ID card already exists');
            }
        }

        const customer = this.customerRepository.create(createCustomerDto);
        return this.customerRepository.save(customer);
    }

    async findAll(query: QueryCustomerDto) {
        const { page = 1, limit = 10, search, status, verificationStatus } = query;

        const queryBuilder = this.customerRepository.createQueryBuilder('customer');

        if (status) {
            queryBuilder.andWhere('customer.status = :status', { status });
        }

        if (verificationStatus) {
            queryBuilder.andWhere('customer.verificationStatus = :verificationStatus', { verificationStatus });
        }

        if (search) {
            queryBuilder.andWhere(
                '(customer.fullName ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        queryBuilder.orderBy('customer.createdAt', 'DESC');

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: number): Promise<Customer> {
        const customer = await this.customerRepository.findOne({ where: { id } });
        if (!customer) {
            throw new NotFoundException(`Customer with ID ${id} not found`);
        }
        return customer;
    }

    async update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
        const customer = await this.findOne(id);
        Object.assign(customer, updateCustomerDto);
        return this.customerRepository.save(customer);
    }

    async remove(id: number): Promise<void> {
        const customer = await this.findOne(id);
        await this.customerRepository.remove(customer);
    }
}
