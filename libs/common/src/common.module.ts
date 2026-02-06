import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { CaslAbilityFactory } from './casl/casl-ability.factory';

@Module({
  providers: [CommonService, CaslAbilityFactory],
  exports: [CommonService, CaslAbilityFactory],
})
export class CommonModule { }
