import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { UpdateOrganizationSettingsDto } from '../dtos/update-organization-settings.dto';

@Injectable()
export class UpdateOrganizationSettingsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(
    id: string,
    dto: UpdateOrganizationSettingsDto,
  ): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Use domain method to update settings (includes validation)
    organization.updateSettings(dto);

    // Persist and return updated entity
    return this.organizationRepository.update(id, organization);
  }
}
