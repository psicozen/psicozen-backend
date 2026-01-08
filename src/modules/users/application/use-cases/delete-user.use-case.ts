import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from '../../../../core/domain/exceptions';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, hardDelete: boolean = false): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User', id);
    }

    if (hardDelete) {
      await this.userRepository.delete(id);
    } else {
      await this.userRepository.softDelete(id);
    }
  }
}
