import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { MailService } from '@app/common';

// ── ALLOWED FIELDS ────────────────────────────────────────────────────────────

const ALLOWED_CREATE_FIELDS = [
  'nombre',
  'apellidos',
  'imagen',
  'genero',
  'licenciatura',
  'direccion',
  'curriculum',
  'fechaNacimiento',
  'estadoCivil',
  'facebook',
  'tiktok',
  'cargo',
  'celular',
  'tenantId',
  'personaId',
  'estado',
  'username',
  'cargoPostulacionId',
  'ci',
] as const;

const ALLOWED_UPDATE_FIELDS = [
  ...ALLOWED_CREATE_FIELDS,
  'password',
  'verificationCode',
  'resumenProfesional',
  'habilidades',
  'idiomas',
  'experienciaLaboral',
  'linkedinUrl',
] as const;

function buildUserPayload(
  data: any,
  allowedFields: readonly string[],
): Record<string, any> {
  const payload: Record<string, any> = {};
  for (const field of allowedFields) {
    if (data[field] === undefined) continue;
    let value = data[field];
    if (
      ['tenantId', 'personaId', 'cargoPostulacionId'].includes(field) &&
      value === ''
    )
      value = null;
    if (field === 'cargo') {
      payload['cargoStr'] = value;
      continue;
    }
    if (field === 'ci') {
      payload['ci'] = value ? BigInt(value) : null;
      continue;
    }
    if (field !== 'verificationCode') payload[field] = value;
  }
  return payload;
}

// ── USE CASES ────────────────────────────────────────────────────────────────

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(data: any, currentUser: any): Promise<User> {
    const {
      roles,
      sedes,
      email,
      password: providedPassword,
      ...userData
    } = data;
    const password = providedPassword || 'secret123';
    const hashedPassword = await bcrypt.hash(password, 12);
    const correo = email || data.correo;

    const payload = buildUserPayload(userData, ALLOWED_CREATE_FIELDS);
    const createData = {
      ...payload,
      password: hashedPassword,
      correo,
      username: data.username,
      tenantId: data.tenantId || currentUser?.tenantId || null,
      createdBy: currentUser?.id || null,
      roles,
      sedes,
    };

    const user = await this.repository.create(createData);
    await this.mailService
      .sendWelcomeEmail(correo, data.nombre, data.username)
      .catch(() => null);
    return user;
  }
}

@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
  ) {}

  async execute(ability: any, search?: string): Promise<User[]> {
    return this.repository.findAll({ ability, search });
  }
}

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
  ) {}

  async execute(id: string, ability?: any): Promise<User> {
    const user = await this.repository.findById(id, ability);
    if (!user)
      throw new NotFoundException(
        'Usuario no encontrado o sin permisos para verlo',
      );
    return user;
  }
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
  ) {}

  async execute(
    id: string,
    data: any,
    currentUser: any,
    ability?: any,
  ): Promise<User> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    // Solo exigir código de verificación si se está intentando cambiar el correo
    const isEmailChanging = data.email && data.email !== existing.correo;
    if (isEmailChanging) {
      const raw = await (this.repository as any).getRawToken(id);
      if (!data.verificationCode || raw !== data.verificationCode) {
        throw new ForbiddenException(
          'Se requiere código de verificación válido para cambiar el correo electrónico institucional',
        );
      }
    }

    const { roles, sedes, email, ...userData } = data;
    const payload = buildUserPayload(userData, ALLOWED_UPDATE_FIELDS);

    if (email) payload['correo'] = email;
    if (payload['password']) {
      payload['password'] = await bcrypt.hash(payload['password'], 12);
      payload['requiresPasswordChange'] = false;
      payload['resetPasswordToken'] = null;
      payload['resetPasswordExpires'] = null;
    }

    payload['updatedBy'] = currentUser?.id || null;
    if (roles !== undefined) payload['roles'] = roles;
    if (sedes !== undefined) payload['sedes'] = sedes;

    return this.repository.update(id, payload, ability);
  }
}

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
  ) {}

  async execute(id: string, currentUser: any): Promise<void> {
    return this.repository.delete(id, currentUser?.id);
  }
}

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(id: string, currentUser: any): Promise<User> {
    const defaultPassword = 'profe2026';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    const token = crypto.randomInt(100000, 999999).toString();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);

    const user = await this.repository.update(id, {
      password: hashedPassword,
      requiresPasswordChange: true,
      resetPasswordExpires: expiryDate,
      updatedBy: currentUser?.id || null,
      resetPasswordToken: token,
    });

    await this.mailService
      .sendPasswordResetSuccess(user.correo, user.nombre, defaultPassword)
      .catch(() => null);
    return user;
  }
}

@Injectable()
export class RequestEmailVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(id: string, email: string): Promise<{ message: string }> {
    const existingUser = await this.repository.findByEmail(email);
    if (existingUser && existingUser.id !== id) {
      throw new ForbiddenException(
        'Este correo electrónico ya se encuentra registrado en el sistema por otro usuario',
      );
    }

    const token = crypto.randomInt(100000, 999999).toString();
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 15);

    await this.repository.update(id, {
      resetPasswordToken: token,
      resetPasswordExpires: expiryDate,
    });
    await this.mailService
      .sendPasswordResetEmail(email, token, 'Usuario de Validación')
      .catch(() => null);
    return { message: 'Código enviado correctamente' };
  }
}
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: IUserRepository,
  ) {}

  async execute(id: string, oldPass: string, newPass: string): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isMatch = await bcrypt.compare(oldPass, (user as any).password);
    if (!isMatch) {
      throw new ForbiddenException('La contraseña actual es incorrecta');
    }

    if (newPass.length < 6) {
      throw new ForbiddenException(
        'La nueva contraseña debe tener al menos 6 caracteres',
      );
    }

    const hashedPassword = await bcrypt.hash(newPass, 12);
    await this.repository.update(id, {
      password: hashedPassword,
      requiresPasswordChange: false,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }
}
