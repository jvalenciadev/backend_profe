-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('activo', 'inactivo', 'eliminado', 'vista', 'pendiente', 'aprobado', 'inhabilitado', 'cancelado', 'finalizado');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "imagen" TEXT,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "genero" TEXT DEFAULT 'No prefiero decirlo',
    "licenciatura" TEXT,
    "direccion" TEXT,
    "curriculum" TEXT,
    "fecha_nacimiento" TEXT,
    "estado_civil" TEXT,
    "facebook" TEXT,
    "tiktok" TEXT,
    "cargo" TEXT,
    "celular" TEXT,
    "correo" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "remember_token" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'activo',
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),
    "requires_password_change" BOOLEAN DEFAULT false,
    "tenant_id" UUID,
    "per_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "sede_ids" TEXT,
    "pro_ids" TEXT,
    "per_ci" BIGINT,
    "bp_es_maestro" BOOLEAN NOT NULL DEFAULT false,
    "bp_lic_universitaria" TEXT,
    "bp_lic_mescp" TEXT,
    "bp_tiene_produccion" BOOLEAN NOT NULL DEFAULT false,
    "bp_hoja_vida_pdf" TEXT,
    "per_rda" BIGINT,
    "bp_rda_pdf" TEXT,
    "cat_id" UUID,
    "car_id_postulacion" UUID,
    "bp_resumen_profesional" TEXT,
    "bp_habilidades" TEXT,
    "bp_idiomas" TEXT,
    "bp_experiencia_laboral" TEXT,
    "bp_linkedin_url" TEXT,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "userId" UUID,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" UUID,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog" (
    "blog_id" UUID NOT NULL,
    "blog_titulo" TEXT NOT NULL,
    "blog_descripcion" TEXT,
    "blog_fecha" DATE,
    "blog_estado" "Estado" NOT NULL DEFAULT 'activo',
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "blog_imagenes" JSONB,
    "blog_tipo" TEXT,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "blog_pkey" PRIMARY KEY ("blog_id")
);

-- CreateTable
CREATE TABLE "bp_posgrado" (
    "bpg_id" UUID NOT NULL,
    "btp_id" UUID NOT NULL,
    "bpg_titulo" TEXT NOT NULL,
    "bpg_fecha" DATE NOT NULL,
    "bpg_imagen" TEXT,
    "bpg_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "user_id" UUID NOT NULL,

    CONSTRAINT "bp_posgrado_pkey" PRIMARY KEY ("bpg_id")
);

-- CreateTable
CREATE TABLE "bp_produccion_intelectual" (
    "bpi_id" UUID NOT NULL,
    "bpi_titulo" TEXT NOT NULL,
    "bpi_anio_publicacion" INTEGER NOT NULL,
    "bpi_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "user_id" UUID NOT NULL,

    CONSTRAINT "bp_produccion_intelectual_pkey" PRIMARY KEY ("bpi_id")
);

-- CreateTable
CREATE TABLE "bp_tipo_posgrado" (
    "btp_id" UUID NOT NULL,
    "btp_nombre" TEXT NOT NULL,
    "btp_estado" "Estado" NOT NULL DEFAULT 'activo',
    "btp_orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bp_tipo_posgrado_pkey" PRIMARY KEY ("btp_id")
);

-- CreateTable
CREATE TABLE "calificacion_participante" (
    "cp_id" UUID NOT NULL,
    "cp_puntaje" INTEGER NOT NULL,
    "cp_estado" TEXT NOT NULL DEFAULT 'aprobado',
    "pi_id" UUID NOT NULL,
    "pm_id" UUID NOT NULL,
    "pc_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calificacion_participante_pkey" PRIMARY KEY ("cp_id")
);

-- CreateTable
CREATE TABLE "cargo" (
    "car_id" UUID NOT NULL,
    "car_nombre" TEXT NOT NULL,
    "car_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "cargo_pkey" PRIMARY KEY ("car_id")
);

-- CreateTable
CREATE TABLE "comunicado" (
    "comun_id" UUID NOT NULL,
    "comun_imagen" TEXT NOT NULL,
    "comun_nombre" TEXT NOT NULL,
    "comun_descripcion" TEXT NOT NULL,
    "comun_importancia" TEXT NOT NULL DEFAULT 'normal',
    "comun_estado" "Estado" NOT NULL DEFAULT 'activo',
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "comun_tipo" TEXT,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "comunicado_pkey" PRIMARY KEY ("comun_id")
);

-- CreateTable
CREATE TABLE "departamento" (
    "dep_id" UUID NOT NULL,
    "dep_nombre" TEXT NOT NULL,
    "dep_abreviacion" TEXT NOT NULL,
    "dep_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "departamento_pkey" PRIMARY KEY ("dep_id")
);

-- CreateTable
CREATE TABLE "distrito" (
    "dis_id" UUID NOT NULL,
    "dis_codigo" INTEGER NOT NULL,
    "dis_nombre" TEXT NOT NULL,
    "dis_estado" "Estado" NOT NULL DEFAULT 'activo',
    "dep_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "distrito_pkey" PRIMARY KEY ("dis_id")
);

-- CreateTable
CREATE TABLE "evaluacion_admins" (
    "eva_id" UUID NOT NULL,
    "eva_puntaje_total" INTEGER NOT NULL,
    "eva_codigo_verificacion" TEXT NOT NULL,
    "eva_qr_code" TEXT,
    "eva_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "evp_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "car_id_postulacion" UUID,

    CONSTRAINT "evaluacion_admins_pkey" PRIMARY KEY ("eva_id")
);

-- CreateTable
CREATE TABLE "evaluacion_criterio" (
    "evc_id" UUID NOT NULL,
    "evp_id" UUID NOT NULL,
    "evc_nombre" TEXT NOT NULL,
    "evc_puntaje_maximo" INTEGER NOT NULL,
    "evc_orden" INTEGER NOT NULL DEFAULT 0,
    "evc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluacion_criterio_pkey" PRIMARY KEY ("evc_id")
);

-- CreateTable
CREATE TABLE "evaluacion_periodo" (
    "evp_id" UUID NOT NULL,
    "evp_periodo" TEXT NOT NULL,
    "evp_gestion" TEXT NOT NULL,
    "evp_semestre" TEXT NOT NULL,
    "evp_activo" BOOLEAN NOT NULL DEFAULT true,
    "evp_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "evaluacion_periodo_pkey" PRIMARY KEY ("evp_id")
);

-- CreateTable
CREATE TABLE "evaluacion_puntaje" (
    "evpu_id" UUID NOT NULL,
    "eva_id" UUID NOT NULL,
    "evc_id" UUID NOT NULL,
    "evpu_puntaje" INTEGER NOT NULL,

    CONSTRAINT "evaluacion_puntaje_pkey" PRIMARY KEY ("evpu_id")
);

-- CreateTable
CREATE TABLE "evento" (
    "eve_id" UUID NOT NULL,
    "eve_nombre" TEXT NOT NULL,
    "eve_codigo" TEXT,
    "eve_descripcion" TEXT NOT NULL,
    "eve_banner" TEXT NOT NULL,
    "eve_afiche" TEXT NOT NULL,
    "pm_ids" TEXT NOT NULL,
    "eve_fecha" DATE NOT NULL,
    "eve_inscripcion" BOOLEAN NOT NULL DEFAULT true,
    "eve_asistencia" BOOLEAN,
    "eve_codigo_asistencia" TEXT,
    "eve_lugar" TEXT NOT NULL,
    "eve_total_inscrito" INTEGER NOT NULL DEFAULT 0,
    "eve_estado" "Estado" NOT NULL DEFAULT 'activo',
    "et_id" UUID NOT NULL,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("eve_id")
);

-- CreateTable
CREATE TABLE "evento_cuestionario" (
    "eve_cue_id" UUID NOT NULL,
    "eve_cue_titulo" TEXT NOT NULL,
    "eve_cue_descripcion" TEXT NOT NULL,
    "eve_cue_fecha_ini" TIMESTAMP(3) NOT NULL,
    "eve_cue_fecha_fin" TIMESTAMP(3) NOT NULL,
    "eve_cue_tiempo_max" INTEGER,
    "eve_cue_pts_max" INTEGER,
    "eve_cue_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "evento_cuestionario_pkey" PRIMARY KEY ("eve_cue_id")
);

-- CreateTable
CREATE TABLE "evento_inscripcion_v2" (
    "eve_ins_id" UUID NOT NULL,
    "eve_ins_asistencia" BOOLEAN NOT NULL DEFAULT false,
    "eve_ins_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_nro_deposito" TEXT,
    "eve_fecha_deposito" DATE,
    "eve_imagen_deposito" TEXT,
    "eve_per_id" UUID NOT NULL,
    "eve_id" UUID NOT NULL,
    "dep_id" UUID NOT NULL,
    "pm_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "evento_inscripcion_v2_pkey" PRIMARY KEY ("eve_ins_id")
);

-- CreateTable
CREATE TABLE "evento_opciones" (
    "eve_opc_id" UUID NOT NULL,
    "eve_opc_texto" TEXT NOT NULL,
    "eve_opc_es_correcta" BOOLEAN NOT NULL DEFAULT false,
    "eve_opc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_pre_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "evento_opciones_pkey" PRIMARY KEY ("eve_opc_id")
);

-- CreateTable
CREATE TABLE "evento_personas" (
    "eve_per_id" UUID NOT NULL,
    "eve_per_ci" BIGINT NOT NULL,
    "eve_per_complemento" TEXT NOT NULL,
    "eve_per_expedido" TEXT NOT NULL,
    "eve_per_nombre_1" TEXT NOT NULL,
    "eve_per_nombre_2" TEXT NOT NULL,
    "eve_per_apellido_1" TEXT NOT NULL,
    "eve_per_apellido_2" TEXT NOT NULL,
    "eve_per_fecha_nacimiento" DATE NOT NULL,
    "eve_per_correo" TEXT NOT NULL,
    "eve_per_celular" TEXT NOT NULL,
    "gen_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "evento_personas_pkey" PRIMARY KEY ("eve_per_id")
);

-- CreateTable
CREATE TABLE "evento_pregunta" (
    "eve_pre_id" UUID NOT NULL,
    "eve_pre_texto" TEXT NOT NULL,
    "eve_pre_tipo" TEXT NOT NULL,
    "eve_pre_puntos" INTEGER NOT NULL DEFAULT 1,
    "eve_pre_obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "eve_pre_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_cue_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "evento_pregunta_pkey" PRIMARY KEY ("eve_pre_id")
);

-- CreateTable
CREATE TABLE "evento_respuestas" (
    "eve_res_id" BIGSERIAL NOT NULL,
    "eve_res_texto" TEXT,
    "eve_res_es_correcta" BOOLEAN NOT NULL DEFAULT false,
    "eve_res_puntos" INTEGER NOT NULL DEFAULT 0,
    "eve_cue_id" UUID,
    "eve_pre_id" UUID NOT NULL,
    "eve_opc_id" UUID,
    "eve_per_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "evento_respuestas_pkey" PRIMARY KEY ("eve_res_id")
);

-- CreateTable
CREATE TABLE "evento_restriccion" (
    "er_id" UUID NOT NULL,
    "er_descripcion" TEXT NOT NULL,
    "gen_ids" TEXT,
    "sub_ids" TEXT,
    "niv_ids" TEXT,
    "esp_ids" TEXT,
    "pr_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "evento_restriccion_pkey" PRIMARY KEY ("er_id")
);

-- CreateTable
CREATE TABLE "galeria" (
    "galeria_id" UUID NOT NULL,
    "galeria_titulo" TEXT NOT NULL,
    "galeria_descripcion" TEXT,
    "galeria_imagen" TEXT NOT NULL,
    "galeria_estado" "Estado" NOT NULL DEFAULT 'activo',
    "sede_id" UUID,
    "pro_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "galeria_pkey" PRIMARY KEY ("galeria_id")
);

-- CreateTable
CREATE TABLE "upload_configs" (
    "uc_id" UUID NOT NULL,
    "uc_table_name" TEXT NOT NULL,
    "uc_max_size_mb" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "uc_allowed_extensions" TEXT NOT NULL DEFAULT 'jpg,jpeg,png,webp',
    "uc_min_width" INTEGER,
    "uc_max_width" INTEGER,
    "uc_min_height" INTEGER,
    "uc_max_height" INTEGER,
    "uc_aspect_ratio" TEXT,
    "uc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_configs_pkey" PRIMARY KEY ("uc_id")
);

-- CreateTable
CREATE TABLE "model_has_roles" (
    "model_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "model_type" TEXT NOT NULL DEFAULT 'App\User',

    CONSTRAINT "model_has_roles_pkey" PRIMARY KEY ("model_id","role_id","model_type")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "guard_name" TEXT NOT NULL,
    "group_name" TEXT,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "conditions" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "perm_estado" "Estado" NOT NULL DEFAULT 'activo',
    "updated_by" UUID,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profe" (
    "profe_id" UUID NOT NULL,
    "profe_imagen" TEXT NOT NULL,
    "profe_logo_principal" TEXT,
    "profe_nombre" TEXT NOT NULL,
    "profe_nombre_abreviado" TEXT,
    "profe_descripcion" TEXT NOT NULL,
    "profe_sobre_nosotros" TEXT NOT NULL,
    "profe_mision" TEXT NOT NULL,
    "profe_vision" TEXT NOT NULL,
    "profe_actividad" TEXT NOT NULL,
    "profe_fecha_creacion" DATE NOT NULL,
    "profe_correo" TEXT,
    "profe_celular" TEXT,
    "profe_telefono" TEXT,
    "profe_pagina" TEXT,
    "profe_facebook" TEXT,
    "profe_tiktok" TEXT,
    "profe_youtube" TEXT,
    "profe_ubicacion" TEXT NOT NULL,
    "profe_latitud" DECIMAL(11,8),
    "profe_longitud" DECIMAL(11,8),
    "profe_banner" TEXT NOT NULL,
    "profe_afiche" TEXT NOT NULL,
    "profe_convocatoria" TEXT NOT NULL,
    "profe_color" TEXT DEFAULT '#1474a6',
    "profe_color_secundario" TEXT DEFAULT '#4f46e5',
    "profe_estado" "Estado" NOT NULL DEFAULT 'activo',
    "profe_mantenimiento" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "profe_pkey" PRIMARY KEY ("profe_id")
);

-- CreateTable
CREATE TABLE "programa" (
    "pro_id" UUID NOT NULL,
    "pro_codigo" TEXT,
    "pro_nombre" TEXT NOT NULL,
    "pro_nombre_abre" TEXT,
    "pro_contenido" TEXT NOT NULL,
    "pro_horario" TEXT,
    "pro_carga_horaria" INTEGER NOT NULL,
    "pro_costo" INTEGER NOT NULL,
    "pro_banner" TEXT NOT NULL,
    "pro_afiche" TEXT NOT NULL,
    "pro_convocatoria" TEXT,
    "pro_fecha_inicio_inscripcion" DATE NOT NULL,
    "pro_fecha_fin_inscripcion" DATE NOT NULL,
    "pro_fecha_inicio_clase" DATE NOT NULL,
    "pro_estado_inscripcion" BOOLEAN NOT NULL DEFAULT true,
    "pro_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pd_id" UUID NOT NULL,
    "pro_tip_id" UUID NOT NULL,
    "pm_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_pkey" PRIMARY KEY ("pro_id")
);

-- CreateTable
CREATE TABLE "programa_baucher" (
    "pro_bau_id" UUID NOT NULL,
    "pro_bau_imagen" TEXT NOT NULL,
    "pro_bau_nro_deposito" BIGINT,
    "pro_bau_monto" INTEGER NOT NULL,
    "pro_bau_fecha" DATE NOT NULL,
    "pro_bau_tipo_pago" TEXT NOT NULL DEFAULT 'Baucher',
    "pro_bau_confirmado" BOOLEAN,
    "pro_bau_fecha_conf" TIMESTAMP(3),
    "pi_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "pro_bau_estado" "Estado" NOT NULL DEFAULT 'activo',
    "updated_by" UUID,

    CONSTRAINT "programa_baucher_pkey" PRIMARY KEY ("pro_bau_id")
);

-- CreateTable
CREATE TABLE "programa_calificacion" (
    "pc_id" UUID NOT NULL,
    "pc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_tip_id" UUID NOT NULL,
    "ptc_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_calificacion_pkey" PRIMARY KEY ("pc_id")
);

-- CreateTable
CREATE TABLE "programa_dos" (
    "pro_id" UUID NOT NULL,
    "pro_codigo" TEXT,
    "pro_nombre" TEXT NOT NULL,
    "pro_nombre_abre" TEXT,
    "pro_contenido" TEXT NOT NULL,
    "pro_horario" TEXT,
    "pro_carga_horaria" INTEGER NOT NULL,
    "pro_costo" INTEGER NOT NULL,
    "pro_banner" TEXT NOT NULL,
    "pro_afiche" TEXT NOT NULL,
    "pro_convocatoria" TEXT,
    "pro_fecha_inicio_inscripcion" DATE NOT NULL,
    "pro_fecha_fin_inscripcion" DATE NOT NULL,
    "pro_fecha_inicio_clase" DATE NOT NULL,
    "pro_estado_inscripcion" BOOLEAN NOT NULL DEFAULT true,
    "pro_estado" "Estado" NOT NULL DEFAULT 'activo',
    "sede_id" UUID,
    "pd_id" UUID NOT NULL,
    "pv_id" UUID NOT NULL,
    "pro_tip_id" UUID NOT NULL,
    "pm_id" UUID NOT NULL,
    "programa_id" UUID,
    "dep_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_dos_pkey" PRIMARY KEY ("pro_id")
);

-- CreateTable
CREATE TABLE "programa_dos_facilitador" (
    "pdf_id" UUID NOT NULL,
    "pro_id" UUID NOT NULL,
    "pm_id" UUID NOT NULL,
    "pdt_id" UUID NOT NULL,
    "fac_id" UUID NOT NULL,
    "pdf_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_dos_facilitador_pkey" PRIMARY KEY ("pdf_id")
);

-- CreateTable
CREATE TABLE "programa_dos_turno" (
    "pdt_id" UUID NOT NULL,
    "pro_id" UUID NOT NULL,
    "pro_tur_ids" TEXT NOT NULL,
    "pro_cupo" INTEGER NOT NULL,
    "pro_cupo_preinscrito" INTEGER NOT NULL,
    "pdt_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_dos_turno_pkey" PRIMARY KEY ("pdt_id")
);

-- CreateTable
CREATE TABLE "programa_duracion" (
    "pd_id" UUID NOT NULL,
    "pd_nombre" TEXT NOT NULL,
    "pd_semana" INTEGER NOT NULL,
    "pd_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_duracion_pkey" PRIMARY KEY ("pd_id")
);

-- CreateTable
CREATE TABLE "programa_inscripcion" (
    "pi_id" UUID NOT NULL,
    "pi_doc_digital" TEXT,
    "pi_certificacion" BOOLEAN,
    "pi_entrego_cert" BOOLEAN,
    "folio" BIGINT,
    "partida" BIGINT,
    "carton" BIGINT,
    "pi_licenciatura" TEXT,
    "pi_unidad_educativa" TEXT,
    "pi_nivel" TEXT,
    "pi_subsistema" TEXT,
    "pi_materia" TEXT,
    "pi_observacion" TEXT,
    "pi_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_id" UUID NOT NULL,
    "pro_tur_id" UUID NOT NULL,
    "sede_id" UUID NOT NULL,
    "pie_id" UUID NOT NULL,
    "per_id" UUID NOT NULL,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_inscripcion_pkey" PRIMARY KEY ("pi_id")
);

-- CreateTable
CREATE TABLE "programa_inscripcion_estado" (
    "pie_id" UUID NOT NULL,
    "pie_nombre" TEXT NOT NULL,
    "pie_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "programa_inscripcion_estado_pkey" PRIMARY KEY ("pie_id")
);

-- CreateTable
CREATE TABLE "programa_modalidad" (
    "pm_id" UUID NOT NULL,
    "pm_nombre" TEXT NOT NULL,
    "pm_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_modalidad_pkey" PRIMARY KEY ("pm_id")
);

-- CreateTable
CREATE TABLE "programa_modulo" (
    "pm_id" UUID NOT NULL,
    "pm_codigo" TEXT,
    "pm_nombre" TEXT NOT NULL,
    "pm_descripcion" TEXT NOT NULL,
    "pm_nota_minima" INTEGER NOT NULL DEFAULT 69,
    "pm_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "programa_modulo_pkey" PRIMARY KEY ("pm_id")
);

-- CreateTable
CREATE TABLE "programa_modulo_dos" (
    "pm_id" UUID NOT NULL,
    "pm_codigo" TEXT,
    "pm_nombre" TEXT NOT NULL,
    "pm_descripcion" TEXT NOT NULL,
    "pm_nota_minima" INTEGER NOT NULL DEFAULT 69,
    "pm_fecha_inicio" DATE NOT NULL,
    "pm_fecha_fin" DATE NOT NULL,
    "pm_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_modulo_dos_pkey" PRIMARY KEY ("pm_id")
);

-- CreateTable
CREATE TABLE "programa_restriccion" (
    "pr_id" UUID NOT NULL,
    "res_descripcion" TEXT NOT NULL,
    "gen_ids" TEXT,
    "sub_ids" TEXT,
    "niv_ids" TEXT,
    "esp_ids" TEXT,
    "cat_ids" TEXT,
    "car_ids" TEXT,
    "pr_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_restriccion_pkey" PRIMARY KEY ("pr_id")
);

-- CreateTable
CREATE TABLE "programa_tipo" (
    "pro_tip_id" UUID NOT NULL,
    "pro_tip_nombre" TEXT NOT NULL,
    "pro_tip_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_tipo_pkey" PRIMARY KEY ("pro_tip_id")
);

-- CreateTable
CREATE TABLE "programa_tipo_calificacion" (
    "ptc_id" UUID NOT NULL,
    "ptc_nombre" TEXT NOT NULL,
    "ptc_nota" INTEGER NOT NULL,
    "ptc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_tipo_calificacion_pkey" PRIMARY KEY ("ptc_id")
);

-- CreateTable
CREATE TABLE "programa_turno" (
    "pro_tur_id" UUID NOT NULL,
    "pro_tur_nombre" TEXT NOT NULL,
    "pro_tur_descripcion" TEXT,
    "pro_tur_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "programa_turno_pkey" PRIMARY KEY ("pro_tur_id")
);

-- CreateTable
CREATE TABLE "programa_version" (
    "pv_id" UUID NOT NULL,
    "pv_nombre" TEXT NOT NULL,
    "pv_romano" TEXT,
    "pv_numero" INTEGER NOT NULL,
    "pv_gestion" TEXT,
    "pv_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "programa_version_pkey" PRIMARY KEY ("pv_id")
);

-- CreateTable
CREATE TABLE "provincia" (
    "prov_id" UUID NOT NULL,
    "prov_nombre" TEXT NOT NULL,
    "prov_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "provincia_pkey" PRIMARY KEY ("prov_id")
);

-- CreateTable
CREATE TABLE "role_has_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_has_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "guard_name" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "estado" "Estado" NOT NULL DEFAULT 'activo',
    "updated_by" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sede" (
    "sede_id" UUID NOT NULL,
    "sede_imagen" TEXT,
    "sede_nombre" TEXT NOT NULL,
    "sede_nombre_abre" TEXT,
    "sede_descripcion" TEXT NOT NULL,
    "sede_imagen_responsable1" TEXT,
    "sede_nombre_responsable1" TEXT,
    "sede_cargo_responsable1" TEXT,
    "sede_imagen_responsable2" TEXT,
    "sede_nombre_responsable2" TEXT,
    "sede_cargo_responsable2" TEXT,
    "sede_contacto_1" INTEGER NOT NULL,
    "sede_contacto_2" INTEGER,
    "sede_facebook" TEXT,
    "sede_tiktok" TEXT,
    "sede_grupo_whatsapp" TEXT,
    "sede_horario" TEXT NOT NULL,
    "sede_turno" TEXT NOT NULL,
    "sede_ubicacion" TEXT NOT NULL,
    "sede_latitud" DECIMAL(11,8),
    "sede_longitud" DECIMAL(11,8),
    "sede_estado" "Estado" NOT NULL DEFAULT 'activo',
    "dep_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("sede_id")
);

-- CreateTable
CREATE TABLE "tipo_evento" (
    "et_id" UUID NOT NULL,
    "et_nombre" TEXT NOT NULL,
    "et_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "tipo_evento_pkey" PRIMARY KEY ("et_id")
);

-- CreateTable
CREATE TABLE "token_dispositivo" (
    "id_token" SERIAL NOT NULL,
    "token" TEXT,
    "tipo_usuario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_dispositivo_pkey" PRIMARY KEY ("id_token")
);

-- CreateTable
CREATE TABLE "unidad_educativa" (
    "uni_edu_id" UUID NOT NULL,
    "uni_edu_codigo" BIGINT NOT NULL,
    "uni_edu_nombre" TEXT NOT NULL,
    "uni_edu_estado" "Estado" NOT NULL DEFAULT 'activo',
    "dis_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "unidad_educativa_pkey" PRIMARY KEY ("uni_edu_id")
);

-- CreateTable
CREATE TABLE "user_has_sedes" (
    "user_id" UUID NOT NULL,
    "sede_id" UUID NOT NULL,

    CONSTRAINT "user_has_sedes_pkey" PRIMARY KEY ("user_id","sede_id")
);

-- CreateTable
CREATE TABLE "video" (
    "video_id" UUID NOT NULL,
    "video_iframe" TEXT NOT NULL,
    "video_tipo" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,
    "video_estado" "Estado" NOT NULL DEFAULT 'activo',

    CONSTRAINT "video_pkey" PRIMARY KEY ("video_id")
);

-- CreateTable
CREATE TABLE "map_cargo" (
    "car_id" UUID NOT NULL,
    "car_nombre" TEXT NOT NULL,
    "car_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_cargo_pkey" PRIMARY KEY ("car_id")
);

-- CreateTable
CREATE TABLE "map_categoria" (
    "cat_id" UUID NOT NULL,
    "cat_nombre" TEXT NOT NULL,
    "cat_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_categoria_pkey" PRIMARY KEY ("cat_id")
);

-- CreateTable
CREATE TABLE "map_especialidad" (
    "esp_id" UUID NOT NULL,
    "esp_nombre" TEXT NOT NULL,
    "esp_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_especialidad_pkey" PRIMARY KEY ("esp_id")
);

-- CreateTable
CREATE TABLE "map_nivel" (
    "niv_id" UUID NOT NULL,
    "niv_nombre" TEXT NOT NULL,
    "niv_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_nivel_pkey" PRIMARY KEY ("niv_id")
);

-- CreateTable
CREATE TABLE "map_subsistema" (
    "sub_id" UUID NOT NULL,
    "sub_nombre" TEXT NOT NULL,
    "sub_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_subsistema_pkey" PRIMARY KEY ("sub_id")
);

-- CreateTable
CREATE TABLE "map_persona" (
    "per_id" UUID NOT NULL,
    "per_rda" BIGINT,
    "per_dgesttla" BIGINT,
    "per_didep" BIGINT,
    "per_ci" BIGINT NOT NULL,
    "per_complemento" TEXT,
    "per_nombre1" TEXT,
    "per_nombre2" TEXT,
    "per_apellido1" TEXT,
    "per_apellido2" TEXT,
    "per_fecha_nacimiento" DATE NOT NULL,
    "per_celular" INTEGER NOT NULL DEFAULT 0,
    "per_correo" TEXT NOT NULL DEFAULT '',
    "per_en_funcion" BOOLEAN NOT NULL DEFAULT true,
    "per_libreta_militar" BOOLEAN NOT NULL DEFAULT true,
    "uni_edu_id" UUID,
    "per_estado" "Estado" NOT NULL DEFAULT 'activo',
    "gen_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "esp_id" UUID NOT NULL,
    "cat_id" UUID NOT NULL,
    "car_id" UUID NOT NULL,
    "sub_id" UUID NOT NULL,
    "niv_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_persona_pkey" PRIMARY KEY ("per_id")
);

-- CreateTable
CREATE TABLE "map_persona_nr" (
    "per_nr_id" UUID NOT NULL,
    "per_nac_provincia" TEXT NOT NULL,
    "per_res_provincia" TEXT NOT NULL,
    "per_nac_municipio" TEXT NOT NULL,
    "per_res_municipio" TEXT NOT NULL,
    "per_nac_localidad" TEXT NOT NULL,
    "per_res_localidad" TEXT NOT NULL,
    "per_res_direccion" TEXT NOT NULL,
    "per_id" UUID NOT NULL,
    "dep_nac_id" BIGINT NOT NULL,
    "dep_res_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_persona_nr_pkey" PRIMARY KEY ("per_nr_id")
);

-- CreateTable
CREATE TABLE "map_genero" (
    "gen_id" UUID NOT NULL,
    "gen_nombre" TEXT NOT NULL,
    "gen_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_genero_pkey" PRIMARY KEY ("gen_id")
);

-- CreateTable
CREATE TABLE "map_area" (
    "area_id" UUID NOT NULL,
    "area_nombre" TEXT NOT NULL,
    "area_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "map_area_pkey" PRIMARY KEY ("area_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_correo_key" ON "admins"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_per_id_key" ON "admins"("per_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_per_rda_key" ON "admins"("per_rda");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_admins_user_periodo_unique" ON "evaluacion_admins"("user_id", "evp_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_puntaje_eval_crit_unique" ON "evaluacion_puntaje"("eva_id", "evc_id");

-- CreateIndex
CREATE UNIQUE INDEX "upload_configs_uc_table_name_key" ON "upload_configs"("uc_table_name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "map_cargo_car_nombre_key" ON "map_cargo"("car_nombre");

-- CreateIndex
CREATE UNIQUE INDEX "map_categoria_cat_nombre_key" ON "map_categoria"("cat_nombre");

-- CreateIndex
CREATE UNIQUE INDEX "map_especialidad_esp_nombre_key" ON "map_especialidad"("esp_nombre");

-- CreateIndex
CREATE UNIQUE INDEX "map_nivel_niv_nombre_key" ON "map_nivel"("niv_nombre");

-- CreateIndex
CREATE UNIQUE INDEX "map_subsistema_sub_nombre_key" ON "map_subsistema"("sub_nombre");

-- CreateIndex
CREATE UNIQUE INDEX "map_persona_per_ci_per_complemento_key" ON "map_persona"("per_ci", "per_complemento");

-- CreateIndex
CREATE UNIQUE INDEX "map_genero_gen_nombre_key" ON "map_genero"("gen_nombre");

-- CreateIndex
CREATE UNIQUE INDEX "map_area_area_nombre_key" ON "map_area"("area_nombre");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_car_id_postulacion_fkey" FOREIGN KEY ("car_id_postulacion") REFERENCES "cargo"("car_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "map_categoria"("cat_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog" ADD CONSTRAINT "blog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bp_posgrado" ADD CONSTRAINT "bp_posgrado_btp_id_fkey" FOREIGN KEY ("btp_id") REFERENCES "bp_tipo_posgrado"("btp_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bp_posgrado" ADD CONSTRAINT "bp_posgrado_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bp_produccion_intelectual" ADD CONSTRAINT "bp_produccion_intelectual_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distrito" ADD CONSTRAINT "distrito_dep_id_fkey" FOREIGN KEY ("dep_id") REFERENCES "departamento"("dep_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_admins" ADD CONSTRAINT "evaluacion_admins_car_id_postulacion_fkey" FOREIGN KEY ("car_id_postulacion") REFERENCES "cargo"("car_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_admins" ADD CONSTRAINT "evaluacion_admins_periodo_fkey" FOREIGN KEY ("evp_id") REFERENCES "evaluacion_periodo"("evp_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluacion_admins" ADD CONSTRAINT "evaluacion_admins_user_fkey" FOREIGN KEY ("user_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluacion_criterio" ADD CONSTRAINT "evaluacion_criterio_periodo_fkey" FOREIGN KEY ("evp_id") REFERENCES "evaluacion_periodo"("evp_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluacion_puntaje" ADD CONSTRAINT "evaluacion_puntaje_crit_fkey" FOREIGN KEY ("evc_id") REFERENCES "evaluacion_criterio"("evc_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluacion_puntaje" ADD CONSTRAINT "evaluacion_puntaje_eval_fkey" FOREIGN KEY ("eva_id") REFERENCES "evaluacion_admins"("eva_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_et_id_fkey" FOREIGN KEY ("et_id") REFERENCES "tipo_evento"("et_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_cuestionario" ADD CONSTRAINT "evento_cuestionario_eve_id_fkey" FOREIGN KEY ("eve_id") REFERENCES "evento"("eve_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_inscripcion_v2" ADD CONSTRAINT "evento_inscripcion_v2_eve_id_fkey" FOREIGN KEY ("eve_id") REFERENCES "evento"("eve_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_inscripcion_v2" ADD CONSTRAINT "evento_inscripcion_v2_eve_per_id_fkey" FOREIGN KEY ("eve_per_id") REFERENCES "evento_personas"("eve_per_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_opciones" ADD CONSTRAINT "evento_opciones_eve_pre_id_fkey" FOREIGN KEY ("eve_pre_id") REFERENCES "evento_pregunta"("eve_pre_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_pregunta" ADD CONSTRAINT "evento_pregunta_eve_cue_id_fkey" FOREIGN KEY ("eve_cue_id") REFERENCES "evento_cuestionario"("eve_cue_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_respuestas" ADD CONSTRAINT "evento_respuestas_eve_pre_id_fkey" FOREIGN KEY ("eve_pre_id") REFERENCES "evento_pregunta"("eve_pre_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_respuestas" ADD CONSTRAINT "evento_respuestas_eve_opc_id_fkey" FOREIGN KEY ("eve_opc_id") REFERENCES "evento_opciones"("eve_opc_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galeria" ADD CONSTRAINT "galeria_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galeria" ADD CONSTRAINT "galeria_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_pd_id_fkey" FOREIGN KEY ("pd_id") REFERENCES "programa_duracion"("pd_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "programa_modalidad"("pm_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_pro_tip_id_fkey" FOREIGN KEY ("pro_tip_id") REFERENCES "programa_tipo"("pro_tip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos" ADD CONSTRAINT "programa_dos_pd_id_fkey" FOREIGN KEY ("pd_id") REFERENCES "programa_duracion"("pd_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos" ADD CONSTRAINT "programa_dos_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "programa_modalidad"("pm_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos" ADD CONSTRAINT "programa_dos_pro_tip_id_fkey" FOREIGN KEY ("pro_tip_id") REFERENCES "programa_tipo"("pro_tip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos" ADD CONSTRAINT "programa_dos_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programa"("pro_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos" ADD CONSTRAINT "programa_dos_pv_id_fkey" FOREIGN KEY ("pv_id") REFERENCES "programa_version"("pv_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos" ADD CONSTRAINT "programa_dos_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos_facilitador" ADD CONSTRAINT "programa_dos_facilitador_fac_id_fkey" FOREIGN KEY ("fac_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos_facilitador" ADD CONSTRAINT "programa_dos_facilitador_pdt_id_fkey" FOREIGN KEY ("pdt_id") REFERENCES "programa_modulo_dos"("pm_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos_facilitador" ADD CONSTRAINT "programa_dos_facilitador_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa_dos"("pro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_dos_turno" ADD CONSTRAINT "programa_dos_turno_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa_dos"("pro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_modulo" ADD CONSTRAINT "programa_modulo_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_modulo_dos" ADD CONSTRAINT "programa_modulo_dos_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa_dos"("pro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sede" ADD CONSTRAINT "sede_dep_id_fkey" FOREIGN KEY ("dep_id") REFERENCES "departamento"("dep_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_sedes" ADD CONSTRAINT "user_has_sedes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_sedes" ADD CONSTRAINT "user_has_sedes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_gen_id_fkey" FOREIGN KEY ("gen_id") REFERENCES "map_genero"("gen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "map_area"("area_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_esp_id_fkey" FOREIGN KEY ("esp_id") REFERENCES "map_especialidad"("esp_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "map_categoria"("cat_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "map_cargo"("car_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "map_subsistema"("sub_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_niv_id_fkey" FOREIGN KEY ("niv_id") REFERENCES "map_nivel"("niv_id") ON DELETE CASCADE ON UPDATE CASCADE;
