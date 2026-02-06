import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { CHECK_POLICIES_KEY, RequiredRule } from '../decorators/check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private caslAbilityFactory: CaslAbilityFactory,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyRules =
            this.reflector.get<RequiredRule[]>(
                CHECK_POLICIES_KEY,
                context.getHandler(),
            ) || [];

        const { user } = context.switchToHttp().getRequest();
        if (!user) return true; // Optionally allow if no user, but usually requires JWT first

        const ability = this.caslAbilityFactory.createForUser(user);

        const isAllowed = policyRules.every((rule) =>
            ability.can(rule.action, rule.subject),
        );

        if (!isAllowed) {
            throw new ForbiddenException('No tienes permisos suficientes para realizar esta acción');
        }

        return true;
    }
}
