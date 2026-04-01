import { Injectable, Inject } from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class GetAllUsersUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly repository: IUserRepository,
  ) {}

  async execute(filter: any = {}): Promise<User[]> {
    return this.repository.findAll(filter);
  }
}
