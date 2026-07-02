import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TerritorialController } from './territorial.controller';
import { TerritorialService } from './territorial.service';
import { AuditInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

// ✅ Módulos con Clean Architecture Completa
import { DistritoModule } from './distrito/distrito.module';
import { DepartamentoModule } from './departamento/departamento.module';
import { SedeModule } from './sede/sede.module';
import { GaleriaModule } from './galeria/galeria.module';
import { ProvinciaModule } from './provincia/provincia.module';
import { UnidadEducativaModule } from './unidad-educativa/unidad-educativa.module';

@Module({
  imports: [
    DatabaseModule,
    DistritoModule,
    DepartamentoModule,
    SedeModule,
    GaleriaModule,
    ProvinciaModule,
    UnidadEducativaModule,
  ],
  controllers: [TerritorialController],
  providers: [
    TerritorialService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class TerritorialModule {}
