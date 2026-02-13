import { AbilityBuilder, PureAbility } from '@casl/ability';
import { PrismaQuery, createPrismaAbility } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

export type AppAbility = PureAbility<[string, any], PrismaQuery>;

@Injectable()
export class CaslAbilityFactory {
    constructor(private prisma: PrismaService) { }

    async createForUser(user: any): Promise<AppAbility> {
        const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

        // 1. Cargar el usuario con sus roles y permisos
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                // role: { ... } removed (legacy)
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: { include: { permission: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!dbUser) return build();

        // 2. Consolidar todos los permisos (RBAC dinámico)
        const allPermissionEntries = [
            // ...(dbUser.role?.permissions || []),
            ...dbUser.roles.flatMap(ur => ur.role.permissions)
        ];

        // 3. Aplicar reglas con condiciones ABAC interpoladas
        for (const entry of allPermissionEntries) {
            const { action, subject, conditions, fields } = entry.permission as any;

            // Interpolación de variables
            let parsedConditions = this.interpolate(conditions, dbUser);

            // LOGICA MULTI-TENANT:
            if (dbUser.tenantId) {
                // Forzamos el filtro por departamento o tenant en todas las reglas
                const depIdSubjects = ['Sede', 'Distrito', 'ProgramaDos', 'EventoInscripcion'];
                const tenantIdSubjects = ['User', 'Blog', 'Comunicado', 'Evento', 'ProgramaInscripcion', 'Video', 'AuditLog'];

                if (depIdSubjects.includes(subject) || subject === 'all') {
                    parsedConditions = { ...parsedConditions, departamentoId: dbUser.tenantId };
                }

                if (tenantIdSubjects.includes(subject) || subject === 'all') {
                    parsedConditions = { ...parsedConditions, tenantId: dbUser.tenantId };
                }
            } else if (parsedConditions) {
                // ADMIN GLOBAL: No tenantId. Eliminamos filtros de tenant si existen en las reglas.
                delete parsedConditions.tenantId;
                delete parsedConditions.departamentoId;
                if (Object.keys(parsedConditions).length === 0) parsedConditions = undefined;
            }

            if (Array.isArray(fields) && fields.length > 0) {
                can(action, subject, fields, parsedConditions);
            } else {
                can(action, subject, parsedConditions);
            }
        }

        return build({
            detectSubjectType: (item: any) => {
                if (typeof item === 'string') return item;
                return (item.constructor.name || item.__typename) as any;
            },
        });
    }

    /**
     * Reemplaza variables en el JSON de condiciones con valores reales del usuario
     * Ejemplo: {"tenantId": "${user.tenantId}"} => {"tenantId": "uuid-del-tenant"}
     */
    private interpolate(conditions: any, user: any): any {
        if (!conditions || Object.keys(conditions).length === 0) return undefined;

        let str = JSON.stringify(conditions);
        str = str.replace(/\${user\.(.+?)}/g, (match, path) => {
            const val = path.split('.').reduce((acc, part) => acc && acc[part], user);
            return val !== undefined ? val : match;
        });

        return JSON.parse(str);
    }
}
