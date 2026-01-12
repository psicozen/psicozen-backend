import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { OrganizationContextMiddleware } from './organization-context.middleware';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../../modules/organizations/domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../../modules/organizations/domain/entities/organization.entity';
import { Request, Response } from 'express';

describe('OrganizationContextMiddleware', () => {
  let middleware: OrganizationContextMiddleware;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;

  const mockActiveOrganization = OrganizationEntity.create({
    name: 'Test Organization',
    type: 'company',
  });
  mockActiveOrganization.id = 'org-123';

  const mockInactiveOrganization = OrganizationEntity.create({
    name: 'Inactive Organization',
    type: 'company',
  });
  mockInactiveOrganization.id = 'org-inactive';
  mockInactiveOrganization.isActive = false;

  beforeEach(async () => {
    mockOrganizationRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findChildren: jest.fn(),
      findActiveByType: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationContextMiddleware,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    middleware = module.get<OrganizationContextMiddleware>(
      OrganizationContextMiddleware,
    );
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };
      mockResponse = {};
      mockNext = jest.fn();
    });

    it('should call next without validation when x-organization-id header is not present', async () => {
      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockOrganizationRepository.findById).not.toHaveBeenCalled();
      expect(mockRequest.organizationContext).toBeUndefined();
    });

    it('should inject organization context when valid organization id is provided', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockOrganizationRepository.findById.mockResolvedValue(
        mockActiveOrganization,
      );

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(
        'org-123',
      );
      expect(mockRequest.organizationContext).toBe(mockActiveOrganization);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when organization is not found', async () => {
      mockRequest.headers = { 'x-organization-id': 'non-existent' };
      mockOrganizationRepository.findById.mockResolvedValue(null);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow('Organização não encontrada');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when organization is inactive', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-inactive' };
      mockOrganizationRepository.findById.mockResolvedValue(
        mockInactiveOrganization,
      );

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow('Organização está inativa');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not modify request when header is empty string', async () => {
      mockRequest.headers = { 'x-organization-id': '' };

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockOrganizationRepository.findById).not.toHaveBeenCalled();
      expect(mockRequest.organizationContext).toBeUndefined();
    });

    it('should handle organization id as array (takes first value)', async () => {
      // In Express, headers can be string | string[] | undefined
      // When it's an array, we cast to string which takes the first element
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockOrganizationRepository.findById.mockResolvedValue(
        mockActiveOrganization,
      );

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.organizationContext).toBe(mockActiveOrganization);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
