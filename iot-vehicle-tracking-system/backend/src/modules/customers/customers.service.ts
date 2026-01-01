import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class CustomersService {
  private readonly logger = createLogger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>
  ) {}

  async findAll(queryDto: QueryCustomerDto) {
    const { page = 1, limit = 20, status, verificationStatus, search } =
      queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    if (verificationStatus) {
      queryBuilder.andWhere('customer.verificationStatus = :verificationStatus', {
        verificationStatus,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(customer.fullName LIKE :search OR customer.phone LIKE :search OR customer.email LIKE :search OR customer.idCardNumber LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();

    const customers = await queryBuilder
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('customer.verifier', 'verifier')
      .skip(skip)
      .take(limit)
      .orderBy('customer.createdAt', 'DESC')
      .getMany();

    return {
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['user', 'verifier'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto) {
    // Check if phone already exists
    if (createCustomerDto.phone) {
      const existingPhone = await this.customerRepository.findOne({
        where: { phone: createCustomerDto.phone },
      });
      if (existingPhone) {
        throw new ConflictException(
          `Customer with phone ${createCustomerDto.phone} already exists`
        );
      }
    }

    // Check if ID card number already exists
    if (createCustomerDto.idCardNumber) {
      const existingIdCard = await this.customerRepository.findOne({
        where: { idCardNumber: createCustomerDto.idCardNumber },
      });
      if (existingIdCard) {
        throw new ConflictException(
          `Customer with ID card number ${createCustomerDto.idCardNumber} already exists`
        );
      }
    }

    const customer = this.customerRepository.create(createCustomerDto);
    const savedCustomer = await this.customerRepository.save(customer);

    this.logger.log(`Customer ${savedCustomer.fullName} created`);

    return savedCustomer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.findOne(id);

    // Check for conflicts
    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existing = await this.customerRepository.findOne({
        where: { phone: updateCustomerDto.phone },
      });
      if (existing) {
        throw new ConflictException(
          `Customer with phone ${updateCustomerDto.phone} already exists`
        );
      }
    }

    if (
      updateCustomerDto.idCardNumber &&
      updateCustomerDto.idCardNumber !== customer.idCardNumber
    ) {
      const existing = await this.customerRepository.findOne({
        where: { idCardNumber: updateCustomerDto.idCardNumber },
      });
      if (existing) {
        throw new ConflictException(
          `Customer with ID card number ${updateCustomerDto.idCardNumber} already exists`
        );
      }
    }

    Object.assign(customer, updateCustomerDto);
    const updatedCustomer = await this.customerRepository.save(customer);

    this.logger.log(`Customer ${updatedCustomer.fullName} updated`);

    return updatedCustomer;
  }

  async remove(id: number) {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);

    this.logger.log(`Customer ${customer.fullName} deleted`);

    return { message: 'Customer deleted successfully' };
  }

  async verify(id: number, verifiedBy: number) {
    const customer = await this.findOne(id);
    customer.verificationStatus = 'verified';
    customer.verifiedBy = verifiedBy;
    customer.verifiedAt = new Date();

    const verifiedCustomer = await this.customerRepository.save(customer);

    this.logger.log(`Customer ${verifiedCustomer.fullName} verified`);

    return verifiedCustomer;
  }
}

