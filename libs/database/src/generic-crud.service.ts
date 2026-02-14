import { PrismaService } from './database.service';
import { accessibleBy } from '@casl/prisma';
import { permittedFieldsOf } from '@casl/ability/extra';

export class GenericCrudService<T> {
    protected readonly caslSubject: string;

    constructor(
        protected readonly prisma: PrismaService,
        protected readonly modelName: string,
        protected readonly hasStatus: boolean = true,
        protected readonly hasAudit: boolean = true,
        caslSubject?: string
    ) {
        this.caslSubject = caslSubject || modelName.charAt(0).toUpperCase() + modelName.slice(1);
    }

    protected getCaslWhere(ability: any, action: string = 'read'): any {
        if (!ability) return {};
        try {
            const rules: any = accessibleBy(ability, action as any);

            // Search for specific subject first, then fallback to 'all' (global permission)
            let criteria = rules[this.caslSubject] || rules.all || { id: { in: [] } };

            // LOGICA GLOBAL: Si no hay reglas restrictivas (objeto vacío en all), dar acceso total
            if (rules.all && Object.keys(rules.all).length === 0) {
                return {};
            }

            // Función recursiva para limpiar campos no soportados
            const cleanCriteria = (obj: any, fieldsToRemove: string[]): any => {
                if (!obj || typeof obj !== 'object') return obj;
                if (obj instanceof Date) return obj; // Skip Dates
                if (Array.isArray(obj)) return obj.map(item => cleanCriteria(item, fieldsToRemove));

                const newObj: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (!fieldsToRemove.includes(key)) {
                        newObj[key] = cleanCriteria(value, fieldsToRemove);
                    }
                }
                return newObj;
            };

            const currentModel = this.modelName.toLowerCase();
            const depIdModels = ['sede', 'distrito', 'programados', 'eventoinscripcion'];
            const tenantIdModels = ['user', 'blog', 'comunicado', 'evento', 'programainscripcion', 'video', 'auditlog'];
            const globalModels = [
                'departamento', 'programa', 'programaduracion', 'programatipo', 'programamodalidad', 'programaversion', 'tipoevento', 'persona',
                'mappersona', 'areatrabajo', 'genero', 'provincia', 'unidadeducativa', 'actaconclusion', 'programaversionoperativa', 'profe',
                'programainscripcionestado', 'programabaucher', 'programarestriccion', 'calificacionparticipante', 'programacalificacion',
                'programatipocalificacion', 'eventorestriccion', 'eventocuestionario', 'eventopregunta', 'eventoopcion', 'eventorespuesta', 'galeria',
                'programadosfacilitador', 'programadosturno', 'programamodulodos', 'evaluacionadmins', 'cargo', 'bancoprofesional'
            ];

            if (globalModels.includes(currentModel)) {
                criteria = cleanCriteria(criteria, ['tenantId', 'departamentoId']);
            } else if (depIdModels.includes(currentModel)) {
                criteria = cleanCriteria(criteria, ['tenantId']);
            } else if (tenantIdModels.includes(currentModel)) {
                criteria = cleanCriteria(criteria, ['departamentoId']);
            } else {
                criteria = cleanCriteria(criteria, ['tenantId', 'departamentoId']);
            }

            return criteria;
        } catch (error) {
            return { id: { in: [] } };
        }
    }

    /**
     * Filtra las columnas (campos) de un objeto o array de objetos según los permisos de CASL
     */
    protected filterFields(data: any | any[], ability: any): any {
        if (!ability || !data) return data;

        const pick = (obj: any, fields: string[]) => {
            if (fields.length === 0) return obj; // Si no hay restricciones, devolver todo
            const result: any = {};
            fields.forEach(f => { if (f in obj) result[f] = obj[f]; });
            return result;
        };

        // Obtener campos permitidos para este sujeto
        const options = { fieldsFrom: (rule: any) => rule.fields || [] };
        const allowedFields = permittedFieldsOf(ability, 'read', this.caslSubject, options);

        if (Array.isArray(data)) {
            return data.map(item => pick(item, allowedFields));
        }
        return pick(data, allowedFields);
    }

    async create(data: any, user?: any) {
        const createData = { ...data };
        if (this.hasAudit) {
            createData.createdBy = user?.id || undefined;
        }

        // AUTO-INJECT TENANT/DEPARTAMENTO
        if (user?.tenantId) {
            const tenantFields: Record<string, string> = {
                'sede': 'departamentoId',
                'distrito': 'departamentoId',
                'programaDos': 'departamentoId',
                'programaInscripcion': 'tenantId',
                'eventoInscripcion': 'departamentoId',
                'user': 'tenantId',
                'blog': 'tenantId',
                'comunicado': 'tenantId',
                'evento': 'tenantId'
            };

            const field = tenantFields[this.modelName];
            if (field && !createData[field]) {
                createData[field] = user.tenantId;
            }
        }

        const res = await (this.prisma[this.modelName] as any).create({
            data: createData,
        });
        return res;
    }

    async findAll(filter: any = {}, ability?: any) {
        let where: any = { ...filter };
        if (this.hasStatus) {
            where.estado = { not: 'ELIMINADO' };
        }

        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }

        const res = await (this.prisma[this.modelName] as any).findMany({
            where,
        });

        return this.filterFields(res, ability);
    }

    async findOne(id: string, ability?: any) {
        let where: any = { id };

        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }

        const res = await (this.prisma[this.modelName] as any).findFirst({
            where
        });

        return this.filterFields(res, ability);
    }

    async findOneByFilter(filter: any, ability?: any) {
        let where: any = { ...filter };

        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'read');
            where = { AND: [where, caslWhere] };
        }

        const res = await (this.prisma[this.modelName] as any).findFirst({
            where
        });

        return this.filterFields(res, ability);
    }

    async update(id: string, data: any, user?: any, ability?: any) {
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'update');
            const exists = await (this.prisma[this.modelName] as any).findFirst({
                where: { AND: [{ id }, caslWhere] }
            });
            if (!exists) throw new Error('No tiene permisos para editar este registro o no existe');
        }

        const updateData = { ...data };
        if (this.hasAudit) {
            updateData.updatedBy = user?.id || undefined;
        }

        const res = await (this.prisma[this.modelName] as any).update({
            where: { id },
            data: updateData,
        });
        return res;
    }

    async remove(id: string, user?: any, ability?: any) {
        if (ability) {
            const caslWhere = this.getCaslWhere(ability, 'delete');
            const exists = await (this.prisma[this.modelName] as any).findFirst({
                where: { AND: [{ id }, caslWhere] }
            });
            if (!exists) throw new Error('No tiene permisos para eliminar este registro o no existe');
        }

        if (this.hasStatus) {
            const updateData: any = {
                estado: 'ELIMINADO',
                deletedAt: new Date(),
            };
            if (this.hasAudit) {
                updateData.deletedBy = user?.id || undefined;
            }
            return await (this.prisma[this.modelName] as any).update({
                where: { id },
                data: updateData,
            });
        }
        return await (this.prisma[this.modelName] as any).delete({
            where: { id },
        });
    }
}
