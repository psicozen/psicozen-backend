import { Injectable, Inject } from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<UserEntity>> {
    const options = {
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.sortBy
        ? { [pagination.sortBy]: pagination.sortOrder }
        : { createdAt: 'DESC' as const },
    };

    return this.userRepository.findAll(options);
  }
}
