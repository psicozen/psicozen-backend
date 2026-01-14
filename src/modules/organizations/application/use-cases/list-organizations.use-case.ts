import { Injectable, Inject } from '@nestjs/common';
import { IsNull } from 'typeorm';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<OrganizationEntity>> {
    const options = {
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.sortBy
        ? { [pagination.sortBy]: pagination.sortOrder }
        : { createdAt: 'DESC' as const },
      // Filter out soft-deleted organizations
      where: { deletedAt: IsNull() },
    };

    return this.organizationRepository.findAll(options);
  }
}
