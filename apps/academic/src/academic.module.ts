import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';

// ✅ Módulos con Clean Architecture Completa
import { ComunicadoModule } from './comunicado/comunicado.module';
import { EvaluacionPeriodoModule } from './evaluacionPeriodo/evaluacionPeriodo.module';
import { ProgramaModule } from './programa/programa.module';
import { InscripcionModule } from './inscripcion/inscripcion.module';
import { OfertaModule } from './oferta/oferta.module';
import { EventoModule } from './evento/evento.module';
import { BlogModule } from './blog/blog.module';

// ✅ Módulos Generados Automáticamente (Clean Architecture)
import { DuracionModule } from './duracion/duracion.module';
import { VersionModule } from './version/version.module';
import { TipoModule } from './tipo/tipo.module';
import { ModalidadModule } from './modalidad/modalidad.module';
import { ModuloMaestroModule } from './modulo-maestro/modulo-maestro.module';
import { ProgramaVersionModule } from './programa-version/programa-version.module';
import { ProgramaModuloVersionModule } from './programa-modulo-version/programa-modulo-version.module';
import { TurnoModule } from './turno/turno.module';
import { BaucherModule } from './baucher/baucher.module';
import { CalificacionModule } from './calificacion/calificacion.module';
import { EventoTipoModule } from './evento-tipo/evento-tipo.module';
import { EventoInscripcionModule } from './evento-inscripcion/evento-inscripcion.module';
import { EventoPersonaModule } from './evento-persona/evento-persona.module';
import { EstadoInscripcionModule } from './estado-inscripcion/estado-inscripcion.module';
import { EventoCuestionarioModule } from './evento-cuestionario/evento-cuestionario.module';
import { EventoPreguntaModule } from './evento-pregunta/evento-pregunta.module';
import { AsignacionFacilitadorModule } from './asignacion-facilitador/asignacion-facilitador.module';

import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { PublicController } from './public.controller';
import { EventosPublicoController } from './eventos-publico.controller';

@Module({
  imports: [
    DatabaseModule,
    CaslModule,

    // Módulos Completos
    ComunicadoModule,
    EvaluacionPeriodoModule,
    ProgramaModule,
    InscripcionModule,
    OfertaModule,
    EventoModule,
    BlogModule,

    // Módulos Generados
    DuracionModule,
    VersionModule,
    TipoModule,
    ModalidadModule,
    ModuloMaestroModule,
    ProgramaVersionModule,
    ProgramaModuloVersionModule,
    TurnoModule,
    BaucherModule,
    CalificacionModule,
    EventoTipoModule,
    EventoInscripcionModule,
    EventoPersonaModule,
    EstadoInscripcionModule,
    EventoCuestionarioModule,
    EventoPreguntaModule,
    AsignacionFacilitadorModule,
  ],
  controllers: [
    AcademicController,
    PublicController,
    EventosPublicoController,
  ],
  providers: [
    AcademicService,
  ],
})
export class AcademicModule { }
