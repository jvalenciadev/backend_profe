import { AbilityBuilder, PureAbility } from '@casl/ability';
import { PrismaQuery, createPrismaAbility } from '@casl/prisma';
import { Injectable } from '@nestjs/common';

export enum Action {
    Manage = 'manage',
    Create = 'create',
    Read = 'read',
    Update = 'update',
    Delete = 'delete',
}

export type Subjects = 'Departamento' | 'Sede' | 'User' | 'Programa' | 'Evento' | 'AuditLog' | 'all';

export type AppAbility = PureAbility<[Action, Subjects], PrismaQuery>;

@Injectable()
export class CaslAbilityFactory {
    createForUser(user: any) {
        const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

        if (user.roles?.includes('SUPER_ADMIN')) {
            can(Action.Manage, 'all');
        } else if (user.roles?.includes('RESPONSABLE_DEPARTAMENTO')) {
            // Access only within their tenant
            can(Action.Manage, 'all', { tenantId: BigInt(user.tenantId) } as any);
        } else if (user.roles?.includes('FACILITADOR')) {
            can(Action.Read, 'Programa');
            can(Action.Read, 'Sede', { id: { in: user.sedes?.map((s: string) => BigInt(s)) } } as any);
        } else {
            can(Action.Read, 'all');
        }

        return build({
            detectSubjectType: (item: any) => item.constructor.name as any,
        });
    }
}
