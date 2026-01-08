import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from '../../../../core/domain/exceptions';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User', id);
    }

    user.updateProfile({
      firstName: dto.firstName,
      lastName: dto.lastName,
      bio: dto.bio,
      photoUrl: dto.photoUrl,
    });

    return this.userRepository.update(id, user);
  }
}
