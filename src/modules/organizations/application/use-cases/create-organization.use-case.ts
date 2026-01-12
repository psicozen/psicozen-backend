import { Injectable, Inject, ConflictException } from '@nestjs/common';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    // Check if slug already exists
    const slug = OrganizationEntity.generateSlug(dto.name);
    const existingOrg = await this.organizationRepository.findBySlug(slug);

    if (existingOrg) {
      throw new ConflictException('Organization with this name already exists');
    }

    // If parentId is provided, verify parent exists
    if (dto.parentId) {
      const parent = await this.organizationRepository.findById(dto.parentId);
      if (!parent) {
        throw new ConflictException('Parent organization not found');
      }
    }

    // Create entity using factory method (includes validation)
    const organization = OrganizationEntity.create({
      name: dto.name,
      type: dto.type,
      settings: dto.settings,
      parentId: dto.parentId,
    });

    // Persist and return
    return this.organizationRepository.create(organization);
  }
}
