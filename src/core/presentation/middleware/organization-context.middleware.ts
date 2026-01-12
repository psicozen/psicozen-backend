import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { IOrganizationRepository } from '../../../modules/organizations/domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../../modules/organizations/domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../../modules/organizations/domain/entities/organization.entity';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      organizationContext?: OrganizationEntity;
    }
  }
}

@Injectable()
export class OrganizationContextMiddleware implements NestMiddleware {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const organizationId = req.headers['x-organization-id'] as string;

    // ID da organização é opcional (alguns endpoints não exigem)
    if (!organizationId) {
      next();
      return;
    }

    // Validar se a organização existe e está ativa
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new UnauthorizedException('Organização não encontrada');
    }

    if (!organization.isActive) {
      throw new UnauthorizedException('Organização está inativa');
    }

    // Injetar contexto da organização na requisição
    req.organizationContext = organization;

    next();
  }
}
