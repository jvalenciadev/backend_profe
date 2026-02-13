import { AppAbility } from './casl-ability.factory';
import { SetMetadata } from '@nestjs/common';

export type PolicyHandlerCallback = (ability: AppAbility) => boolean;

export interface IPolicyHandler {
    handle(ability: AppAbility): boolean;
}

export type PolicyHandler = PolicyHandlerCallback | IPolicyHandler;

export const CHECK_POLICIES_KEY = 'check_policy';

/**
 * Decorador para definir políticas requeridas en un endpoint
 * Ej: @CheckPolicies((ability) => ability.can('read', 'User'))
 */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
    SetMetadata(CHECK_POLICIES_KEY, handlers);
