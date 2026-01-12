import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';

@Injectable()
export class DeleteOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(id: string, hardDelete: boolean = false): Promise<void> {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (hardDelete) {
      await this.organizationRepository.delete(id);
    } else {
      // Soft delete - deactivate and mark as deleted
      organization.deactivate();
      await this.organizationRepository.softDelete(id);
    }
  }
}
