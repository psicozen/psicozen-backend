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
    // Generate slug and check if it already exists
    const slug = OrganizationEntity.generateSlug(dto.name);
    const existingOrg = await this.organizationRepository.findBySlug(slug);

    if (existingOrg) {
      throw new ConflictException(
        'Organization with this name already exists (slug conflict)',
      );
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parentOrg = await this.organizationRepository.findById(
        dto.parentId,
      );
      if (!parentOrg) {
        throw new ConflictException('Parent organization not found');
      }
    }

    // Create organization entity using factory method
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
