import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';

@Injectable()
export class DeleteOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(id: string): Promise<void> {
    // Find existing organization
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if organization has children
    const children = await this.organizationRepository.findChildren(id);
    if (children.length > 0) {
      throw new ConflictException(
        'Cannot delete organization with child organizations',
      );
    }

    // Soft delete using repository method
    await this.organizationRepository.softDelete(id);
  }
}
