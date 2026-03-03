import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
    findById(id: string, ability?: any): Promise<User | null>;
    findAll(filter?: any): Promise<User[]>;
    create(data: any): Promise<User>;
    update(id: string, data: any, ability?: any): Promise<User>;
    delete(id: string, deletedBy?: string): Promise<void>;
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    getRawToken(id: string): Promise<string | null>;
}
