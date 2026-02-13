import { Global, Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PoliciesGuard } from './policies.guard';
import { CaslPrismaService } from './casl-prisma.service';
import { DatabaseModule } from '@app/database';

@Global()
@Module({
    imports: [DatabaseModule],
    providers: [CaslAbilityFactory, PoliciesGuard, CaslPrismaService],
    exports: [CaslAbilityFactory, PoliciesGuard, CaslPrismaService],
})
export class CaslModule { }
