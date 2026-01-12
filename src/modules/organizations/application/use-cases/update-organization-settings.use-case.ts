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
    // Find existing organization
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Update settings using domain method (includes validation)
    organization.updateSettings(dto);

    // Persist and return
    return this.organizationRepository.update(id, organization);
  }
}
