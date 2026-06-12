import { AbilityBuilder, PureAbility } from '@casl/ability';
import { PrismaQuery, createPrismaAbility } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

export type AppAbility = PureAbility<[string, any], PrismaQuery>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private prisma: PrismaService) {}

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
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!dbUser) return build();

    // 2. Consolidar todos los permisos (RBAC dinámico)
    const allPermissionEntries = [
      ...dbUser.roles.flatMap((ur) => ur.role.rolePermissions),
    ];

    // 3. Aplicar reglas con condiciones ABAC interpoladas
    // console.log(`Cargando ${allPermissionEntries.length} permisos para ${dbUser.username}`);
    for (const entry of allPermissionEntries) {
      const { action, subject, conditions, fields } = entry.permission as any;

      // Interpolación de variables
      let parsedConditions = this.interpolate(conditions, dbUser);

      // LOGICA MULTI-TENANT:
      if (dbUser.tenantId) {
        // Subjects filtrados por departamentoId (Sede, Distritos, ProgramaDos pertenecen al departamento/sede)
        const depIdSubjects = [
          'Sede',
          'Distrito',
          'Provincia',
          'UnidadEducativa',
          'ProgramaDos',
          'EventoInscripcion',
        ];

        // Subjects filtrados por tenantId (tenant = departamento del usuario)
        const tenantIdSubjects = [
          'User',
          'Role',
          'Permission',
          'Blog',
          'Comunicado',
          'Evento',
          'Galeria',
          'ProgramaInscripcion',
          'Video',
          'AuditLog',
          'MapPersona',
          'MapCategoria',
          'Inscripcion',
          'EvaluacionAdmins',
          'EvaluacionPuntaje',
          'CorDocumento',
        ];


        // Si tiene acceso 'all', aplicamos AMBOS filtros para evitar fuga de datos
        if (subject === 'all') {
          parsedConditions = {
            ...parsedConditions,
            tenantId: dbUser.tenantId,
          };
        } else {
          if (depIdSubjects.includes(subject)) {
            parsedConditions = {
              ...parsedConditions,
              departamentoId: dbUser.tenantId,
            };
          }

          if (tenantIdSubjects.includes(subject)) {
            parsedConditions = {
              ...parsedConditions,
              tenantId: dbUser.tenantId,
            };
          }
        }
      } else if (parsedConditions) {
        // ADMIN GLOBAL: No tenantId. Eliminamos filtros de tenant si existen en las reglas.
        delete parsedConditions.tenantId;
        delete parsedConditions.departamentoId;
        if (Object.keys(parsedConditions).length === 0)
          parsedConditions = undefined;
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
        return item.constructor.name || item.__typename;
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
