import { Injectable, Inject, ConflictException } from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { User } from '../../domain/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    // 1. Business Validation: Unique Email
    const existingEmail = await this.userRepository.findByEmail(dto.correo);
    if (existingEmail) {
      throw new ConflictException(
        `El correo ${dto.correo} ya está registrado.`,
      );
    }

    // 2. Business Validation: Unique Username
    const existingUsername = await this.userRepository.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException(
        `El nombre de usuario ${dto.username} ya está en uso.`,
      );
    }

    // 3. Security: Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 4. Persistence
    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
      roles: dto.roleIds || [],
      sedes: dto.sedeIds || [],
    });

    return user;
  }
}
