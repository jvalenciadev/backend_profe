/*
  Warnings:

  - The `estado` column on the `admins` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `dep_estado` column on the `departamento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `eve_estado` column on the `evento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `model_has_roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `pro_estado` column on the `programa` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sede_estado` column on the `sede` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[sede_id,pro_id]` on the table `programa_sede_turno` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `apellidos` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `et_id` to the `evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eve_afiche` to the `evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eve_banner` to the `evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eve_lugar` to the `evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eve_total_inscrito` to the `evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pm_ids` to the `evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `area_id` to the `map_persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gen_id` to the `map_persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `map_persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pd_id` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pm_id` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_afiche` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_banner` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_carga_horaria` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_contenido` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_costo` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_fecha_fin_inscripcion` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_fecha_inicio_clase` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_fecha_inicio_inscripcion` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_tip_id` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pv_id` to the `programa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pie_id` to the `programa_inscripcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_tur_id` to the `programa_inscripcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_cupo_preinscrito` to the `programa_sede_turno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pro_tur_ids` to the `programa_sede_turno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `programa_sede_turno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sede_contacto_1` to the `sede` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sede_descripcion` to the `sede` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sede_horario` to the `sede` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sede_turno` to the `sede` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('activo', 'inactivo', 'eliminado', 'vista');

-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_per_id_fkey";

-- DropForeignKey
ALTER TABLE "model_has_roles" DROP CONSTRAINT "model_has_roles_model_id_fkey";

-- DropForeignKey
ALTER TABLE "model_has_roles" DROP CONSTRAINT "model_has_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "programa_inscripcion" DROP CONSTRAINT "programa_inscripcion_pro_id_fkey";

-- DropForeignKey
ALTER TABLE "programa_sede_turno" DROP CONSTRAINT "programa_sede_turno_pro_id_fkey";

-- DropForeignKey
ALTER TABLE "programa_sede_turno" DROP CONSTRAINT "programa_sede_turno_sede_id_fkey";

-- DropForeignKey
ALTER TABLE "role_has_permissions" DROP CONSTRAINT "role_has_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_has_permissions" DROP CONSTRAINT "role_has_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "sede" DROP CONSTRAINT "sede_dep_id_fkey";

-- DropForeignKey
ALTER TABLE "user_has_sedes" DROP CONSTRAINT "user_has_sedes_sede_id_fkey";

-- DropForeignKey
ALTER TABLE "user_has_sedes" DROP CONSTRAINT "user_has_sedes_user_id_fkey";

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "apellidos" TEXT NOT NULL,
ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "celular" INTEGER,
ADD COLUMN     "created_by" BIGINT,
ADD COLUMN     "curriculum" TEXT,
ADD COLUMN     "deleted_by" BIGINT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "estado_civil" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "fecha_nacimiento" TEXT,
ADD COLUMN     "genero" TEXT DEFAULT 'No prefiero decirlo',
ADD COLUMN     "imagen" TEXT,
ADD COLUMN     "licenciatura" TEXT,
ADD COLUMN     "nombre" TEXT NOT NULL,
ADD COLUMN     "pro_ids" TEXT,
ADD COLUMN     "remember_token" TEXT,
ADD COLUMN     "sede_ids" TEXT,
ADD COLUMN     "tiktok" TEXT,
ADD COLUMN     "updated_by" BIGINT,
DROP COLUMN "estado",
ADD COLUMN     "estado" "Estado" NOT NULL DEFAULT 'activo';

-- AlterTable
ALTER TABLE "departamento" DROP COLUMN "dep_estado",
ADD COLUMN     "dep_estado" "Estado" NOT NULL DEFAULT 'activo';

-- AlterTable
ALTER TABLE "evento" ADD COLUMN     "created_by" BIGINT,
ADD COLUMN     "deleted_by" BIGINT,
ADD COLUMN     "et_id" BIGINT NOT NULL,
ADD COLUMN     "eve_afiche" TEXT NOT NULL,
ADD COLUMN     "eve_asistencia" BOOLEAN,
ADD COLUMN     "eve_banner" TEXT NOT NULL,
ADD COLUMN     "eve_codigo" TEXT,
ADD COLUMN     "eve_inscripcion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "eve_lugar" TEXT NOT NULL,
ADD COLUMN     "eve_total_inscrito" BIGINT NOT NULL,
ADD COLUMN     "pm_ids" TEXT NOT NULL,
ADD COLUMN     "updated_by" BIGINT,
ALTER COLUMN "eve_fecha" SET DATA TYPE DATE,
DROP COLUMN "eve_estado",
ADD COLUMN     "eve_estado" "Estado" NOT NULL DEFAULT 'activo';

-- AlterTable
ALTER TABLE "map_persona" ADD COLUMN     "area_id" BIGINT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gen_id" BIGINT NOT NULL,
ADD COLUMN     "per_apellido2" TEXT,
ADD COLUMN     "per_correo" TEXT NOT NULL DEFAULT 'sincorreo',
ADD COLUMN     "per_estado" "Estado" NOT NULL DEFAULT 'activo',
ADD COLUMN     "per_nombre2" TEXT,
ADD COLUMN     "per_rda" BIGINT,
ADD COLUMN     "uni_edu_id" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "per_fecha_nacimiento" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "model_has_roles" DROP CONSTRAINT "model_has_roles_pkey",
ADD CONSTRAINT "model_has_roles_pkey" PRIMARY KEY ("model_id", "role_id", "model_type");

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "group_name" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "programa" ADD COLUMN     "pd_id" BIGINT NOT NULL,
ADD COLUMN     "pm_id" BIGINT NOT NULL,
ADD COLUMN     "pro_afiche" TEXT NOT NULL,
ADD COLUMN     "pro_banner" TEXT NOT NULL,
ADD COLUMN     "pro_carga_horaria" INTEGER NOT NULL,
ADD COLUMN     "pro_contenido" TEXT NOT NULL,
ADD COLUMN     "pro_convocatoria" TEXT,
ADD COLUMN     "pro_costo" INTEGER NOT NULL,
ADD COLUMN     "pro_estado_inscripcion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pro_fecha_fin_inscripcion" DATE NOT NULL,
ADD COLUMN     "pro_fecha_inicio_clase" DATE NOT NULL,
ADD COLUMN     "pro_fecha_inicio_inscripcion" DATE NOT NULL,
ADD COLUMN     "pro_horario" TEXT,
ADD COLUMN     "pro_nombre_abre" TEXT,
ADD COLUMN     "pro_tip_id" BIGINT NOT NULL,
ADD COLUMN     "pv_id" BIGINT NOT NULL,
DROP COLUMN "pro_estado",
ADD COLUMN     "pro_estado" "Estado" NOT NULL DEFAULT 'activo';

-- AlterTable
ALTER TABLE "programa_inscripcion" ADD COLUMN     "carton" BIGINT,
ADD COLUMN     "folio" BIGINT,
ADD COLUMN     "partida" BIGINT,
ADD COLUMN     "pi_certificacion" BOOLEAN,
ADD COLUMN     "pi_doc_digital" TEXT,
ADD COLUMN     "pi_entrego_cert" BOOLEAN,
ADD COLUMN     "pi_estado" "Estado" NOT NULL DEFAULT 'activo',
ADD COLUMN     "pi_licenciatura" TEXT,
ADD COLUMN     "pi_materia" TEXT,
ADD COLUMN     "pi_nivel" TEXT,
ADD COLUMN     "pi_observacion" TEXT,
ADD COLUMN     "pi_subsistema" TEXT,
ADD COLUMN     "pi_unidad_educativa" TEXT,
ADD COLUMN     "pie_id" BIGINT NOT NULL,
ADD COLUMN     "pro_tur_id" BIGINT NOT NULL,
ADD COLUMN     "tenant_id" BIGINT;

-- AlterTable
ALTER TABLE "programa_sede_turno" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pro_cupo_preinscrito" INTEGER NOT NULL,
ADD COLUMN     "pro_tur_ids" TEXT NOT NULL,
ADD COLUMN     "pst_estado" "Estado" NOT NULL DEFAULT 'activo',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "sede" ADD COLUMN     "sede_cargo_responsable1" TEXT,
ADD COLUMN     "sede_cargo_responsable2" TEXT,
ADD COLUMN     "sede_contacto_1" INTEGER NOT NULL,
ADD COLUMN     "sede_contacto_2" INTEGER,
ADD COLUMN     "sede_descripcion" TEXT NOT NULL,
ADD COLUMN     "sede_facebook" TEXT,
ADD COLUMN     "sede_grupo_whatsapp" TEXT,
ADD COLUMN     "sede_horario" TEXT NOT NULL,
ADD COLUMN     "sede_imagen" TEXT,
ADD COLUMN     "sede_imagen_responsable1" TEXT,
ADD COLUMN     "sede_imagen_responsable2" TEXT,
ADD COLUMN     "sede_latitud" DECIMAL(11,8),
ADD COLUMN     "sede_longitud" DECIMAL(11,8),
ADD COLUMN     "sede_nombre_responsable1" TEXT,
ADD COLUMN     "sede_nombre_responsable2" TEXT,
ADD COLUMN     "sede_tiktok" TEXT,
ADD COLUMN     "sede_turno" TEXT NOT NULL,
DROP COLUMN "sede_estado",
ADD COLUMN     "sede_estado" "Estado" NOT NULL DEFAULT 'activo';

-- DropEnum
DROP TYPE "Status";

-- CreateTable
CREATE TABLE "distrito" (
    "dis_id" BIGSERIAL NOT NULL,
    "dis_codigo" INTEGER NOT NULL,
    "dis_nombre" TEXT NOT NULL,
    "dis_estado" "Estado" NOT NULL DEFAULT 'activo',
    "dep_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distrito_pkey" PRIMARY KEY ("dis_id")
);

-- CreateTable
CREATE TABLE "provincia" (
    "prov_id" BIGSERIAL NOT NULL,
    "prov_nombre" TEXT NOT NULL,
    "prov_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provincia_pkey" PRIMARY KEY ("prov_id")
);

-- CreateTable
CREATE TABLE "programa_duracion" (
    "pd_id" BIGSERIAL NOT NULL,
    "pd_nombre" TEXT NOT NULL,
    "pd_semana" INTEGER NOT NULL,
    "pd_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_duracion_pkey" PRIMARY KEY ("pd_id")
);

-- CreateTable
CREATE TABLE "programa_version" (
    "pv_id" BIGSERIAL NOT NULL,
    "pv_nombre" TEXT NOT NULL,
    "pv_romano" TEXT,
    "pv_numero" INTEGER NOT NULL,
    "pv_gestion" TEXT,
    "pv_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_version_pkey" PRIMARY KEY ("pv_id")
);

-- CreateTable
CREATE TABLE "programa_tipo" (
    "pro_tip_id" BIGSERIAL NOT NULL,
    "pro_tip_nombre" TEXT NOT NULL,
    "pro_tip_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_tipo_pkey" PRIMARY KEY ("pro_tip_id")
);

-- CreateTable
CREATE TABLE "programa_modalidad" (
    "pm_id" BIGSERIAL NOT NULL,
    "pm_nombre" TEXT NOT NULL,
    "pm_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_modalidad_pkey" PRIMARY KEY ("pm_id")
);

-- CreateTable
CREATE TABLE "programa_modulo" (
    "pm_id" BIGSERIAL NOT NULL,
    "pm_codigo" TEXT,
    "pm_nombre" TEXT NOT NULL,
    "pm_descripcion" TEXT NOT NULL,
    "pm_nota_minima" INTEGER NOT NULL DEFAULT 69,
    "pm_fecha_inicio" DATE NOT NULL,
    "pm_fecha_fin" DATE NOT NULL,
    "pm_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_modulo_pkey" PRIMARY KEY ("pm_id")
);

-- CreateTable
CREATE TABLE "programa_turno" (
    "pro_tur_id" BIGSERIAL NOT NULL,
    "pro_tur_nombre" TEXT NOT NULL,
    "pro_tur_descripcion" TEXT,
    "pro_tur_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_turno_pkey" PRIMARY KEY ("pro_tur_id")
);

-- CreateTable
CREATE TABLE "programa_inscripcion_estado" (
    "pie_id" BIGSERIAL NOT NULL,
    "pie_nombre" TEXT NOT NULL,
    "pie_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_inscripcion_estado_pkey" PRIMARY KEY ("pie_id")
);

-- CreateTable
CREATE TABLE "programa_baucher" (
    "pro_bau_id" BIGSERIAL NOT NULL,
    "pro_bau_imagen" TEXT NOT NULL,
    "pro_bau_nro_deposito" BIGINT,
    "pro_bau_monto" INTEGER NOT NULL,
    "pro_bau_fecha" DATE NOT NULL,
    "pro_bau_tipo_pago" TEXT NOT NULL DEFAULT 'Baucher',
    "pro_bau_confirmado" BOOLEAN,
    "pro_bau_fecha_conf" TIMESTAMP(3),
    "pi_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_baucher_pkey" PRIMARY KEY ("pro_bau_id")
);

-- CreateTable
CREATE TABLE "programa_restriccion" (
    "pr_id" BIGSERIAL NOT NULL,
    "res_descripcion" TEXT NOT NULL,
    "gen_ids" TEXT,
    "sub_ids" TEXT,
    "niv_ids" TEXT,
    "esp_ids" TEXT,
    "cat_ids" TEXT,
    "car_ids" TEXT,
    "pr_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_restriccion_pkey" PRIMARY KEY ("pr_id")
);

-- CreateTable
CREATE TABLE "calificacion_participante" (
    "cp_id" BIGSERIAL NOT NULL,
    "cp_puntaje" INTEGER NOT NULL,
    "cp_estado" TEXT NOT NULL DEFAULT 'aprobado',
    "pi_id" BIGINT NOT NULL,
    "pm_id" BIGINT NOT NULL,
    "pc_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "programaModalidadId" BIGINT,

    CONSTRAINT "calificacion_participante_pkey" PRIMARY KEY ("cp_id")
);

-- CreateTable
CREATE TABLE "programa_calificacion" (
    "pc_id" BIGSERIAL NOT NULL,
    "pc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "pro_tip_id" BIGINT NOT NULL,
    "ptc_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_calificacion_pkey" PRIMARY KEY ("pc_id")
);

-- CreateTable
CREATE TABLE "programa_tipo_calificacion" (
    "ptc_id" BIGSERIAL NOT NULL,
    "ptc_nombre" TEXT NOT NULL,
    "ptc_nota" INTEGER NOT NULL,
    "ptc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programa_tipo_calificacion_pkey" PRIMARY KEY ("ptc_id")
);

-- CreateTable
CREATE TABLE "acta_conclusion" (
    "ac_id" BIGSERIAL NOT NULL,
    "ac_titulo" TEXT NOT NULL,
    "ac_descripcion" TEXT NOT NULL,
    "ac_url" TEXT,
    "ac_mejor" BOOLEAN,
    "ac_nota" INTEGER,
    "ac_documento" TEXT,
    "ac_deposito_num" BIGINT,
    "ac_deposito_fecha" DATE,
    "ac_deposito_monto" INTEGER,
    "ac_foto" BOOLEAN,
    "pi_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acta_conclusion_pkey" PRIMARY KEY ("ac_id")
);

-- CreateTable
CREATE TABLE "tipo_evento" (
    "et_id" BIGSERIAL NOT NULL,
    "et_nombre" TEXT NOT NULL,
    "et_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_evento_pkey" PRIMARY KEY ("et_id")
);

-- CreateTable
CREATE TABLE "evento_inscripcion_v2" (
    "eve_ins_id" BIGSERIAL NOT NULL,
    "eve_ins_asistencia" BOOLEAN NOT NULL DEFAULT false,
    "eve_ins_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_nro_deposito" TEXT,
    "eve_fecha_deposito" DATE,
    "eve_imagen_deposito" TEXT,
    "eve_per_id" BIGINT NOT NULL,
    "eve_id" BIGINT NOT NULL,
    "dep_id" BIGINT NOT NULL,
    "pm_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_inscripcion_v2_pkey" PRIMARY KEY ("eve_ins_id")
);

-- CreateTable
CREATE TABLE "evento_personas" (
    "eve_per_id" BIGSERIAL NOT NULL,
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

    CONSTRAINT "evento_personas_pkey" PRIMARY KEY ("eve_per_id")
);

-- CreateTable
CREATE TABLE "genero" (
    "gen_id" BIGSERIAL NOT NULL,
    "gen_nombre" TEXT NOT NULL,
    "gen_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genero_pkey" PRIMARY KEY ("gen_id")
);

-- CreateTable
CREATE TABLE "evento_restriccion" (
    "er_id" BIGSERIAL NOT NULL,
    "er_descripcion" TEXT NOT NULL,
    "gen_ids" TEXT,
    "sub_ids" TEXT,
    "niv_ids" TEXT,
    "esp_ids" TEXT,
    "pr_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_restriccion_pkey" PRIMARY KEY ("er_id")
);

-- CreateTable
CREATE TABLE "evento_cuestionario" (
    "eve_cue_id" BIGSERIAL NOT NULL,
    "eve_cue_titulo" TEXT NOT NULL,
    "eve_cue_descripcion" TEXT NOT NULL,
    "eve_cue_fecha_ini" TIMESTAMP(3) NOT NULL,
    "eve_cue_fecha_fin" TIMESTAMP(3) NOT NULL,
    "eve_cue_pts_max" INTEGER,
    "eve_cue_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_cuestionario_pkey" PRIMARY KEY ("eve_cue_id")
);

-- CreateTable
CREATE TABLE "evento_pregunta" (
    "eve_pre_id" BIGSERIAL NOT NULL,
    "eve_pre_texto" TEXT NOT NULL,
    "eve_pre_tipo" TEXT NOT NULL,
    "eve_pre_obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "eve_pre_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_cue_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_pregunta_pkey" PRIMARY KEY ("eve_pre_id")
);

-- CreateTable
CREATE TABLE "evento_opciones" (
    "eve_opc_id" BIGSERIAL NOT NULL,
    "eve_opc_texto" TEXT NOT NULL,
    "eve_opc_es_correcta" BOOLEAN NOT NULL DEFAULT false,
    "eve_opc_estado" "Estado" NOT NULL DEFAULT 'activo',
    "eve_pre_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_opciones_pkey" PRIMARY KEY ("eve_opc_id")
);

-- CreateTable
CREATE TABLE "evento_respuestas" (
    "eve_res_id" BIGSERIAL NOT NULL,
    "eve_res_texto" TEXT NOT NULL,
    "eve_pre_id" BIGINT NOT NULL,
    "eve_opc_id" BIGINT NOT NULL,
    "eve_per_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_respuestas_pkey" PRIMARY KEY ("eve_res_id")
);

-- CreateTable
CREATE TABLE "area_trabajo" (
    "area_id" BIGSERIAL NOT NULL,
    "area_nombre" TEXT NOT NULL,
    "area_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_trabajo_pkey" PRIMARY KEY ("area_id")
);

-- CreateTable
CREATE TABLE "unidad_educativa" (
    "uni_edu_id" BIGSERIAL NOT NULL,
    "uni_edu_codigo" BIGINT NOT NULL,
    "uni_edu_nombre" TEXT NOT NULL,
    "uni_edu_estado" "Estado" NOT NULL DEFAULT 'activo',
    "dis_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidad_educativa_pkey" PRIMARY KEY ("uni_edu_id")
);

-- CreateTable
CREATE TABLE "blog" (
    "blog_id" BIGSERIAL NOT NULL,
    "blog_imagen" TEXT NOT NULL,
    "blog_titulo" TEXT NOT NULL,
    "blog_descripcion" TEXT,
    "blog_fecha" DATE,
    "blog_estado" "Estado" NOT NULL DEFAULT 'activo',
    "tenant_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_pkey" PRIMARY KEY ("blog_id")
);

-- CreateTable
CREATE TABLE "comunicado" (
    "comun_id" BIGSERIAL NOT NULL,
    "comun_imagen" TEXT NOT NULL,
    "comun_nombre" TEXT NOT NULL,
    "comun_descripcion" TEXT NOT NULL,
    "comun_importancia" TEXT NOT NULL DEFAULT 'normal',
    "comun_estado" "Estado" NOT NULL DEFAULT 'activo',
    "tenant_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comunicado_pkey" PRIMARY KEY ("comun_id")
);

-- CreateTable
CREATE TABLE "galeria" (
    "galeria_id" BIGSERIAL NOT NULL,
    "galeria_imagen" TEXT NOT NULL,
    "galeria_estado" "Estado" NOT NULL DEFAULT 'activo',
    "sede_id" BIGINT,
    "pro_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galeria_pkey" PRIMARY KEY ("galeria_id")
);

-- CreateTable
CREATE TABLE "video" (
    "video_id" BIGSERIAL NOT NULL,
    "video_iframe" TEXT NOT NULL,
    "video_tipo" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "tenant_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_pkey" PRIMARY KEY ("video_id")
);

-- CreateTable
CREATE TABLE "profe" (
    "profe_id" BIGSERIAL NOT NULL,
    "profe_nombre" TEXT NOT NULL,
    "profe_estado" "Estado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profe_pkey" PRIMARY KEY ("profe_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programa_restriccion_pro_id_key" ON "programa_restriccion"("pro_id");

-- CreateIndex
CREATE UNIQUE INDEX "evento_restriccion_eve_id_key" ON "evento_restriccion"("eve_id");

-- CreateIndex
CREATE UNIQUE INDEX "programa_sede_turno_sede_id_pro_id_key" ON "programa_sede_turno"("sede_id", "pro_id");

-- AddForeignKey
ALTER TABLE "sede" ADD CONSTRAINT "sede_dep_id_fkey" FOREIGN KEY ("dep_id") REFERENCES "departamento"("dep_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distrito" ADD CONSTRAINT "distrito_dep_id_fkey" FOREIGN KEY ("dep_id") REFERENCES "departamento"("dep_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_sedes" ADD CONSTRAINT "user_has_sedes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_sedes" ADD CONSTRAINT "user_has_sedes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_pd_id_fkey" FOREIGN KEY ("pd_id") REFERENCES "programa_duracion"("pd_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_pv_id_fkey" FOREIGN KEY ("pv_id") REFERENCES "programa_version"("pv_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_pro_tip_id_fkey" FOREIGN KEY ("pro_tip_id") REFERENCES "programa_tipo"("pro_tip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "programa_modalidad"("pm_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_modulo" ADD CONSTRAINT "programa_modulo_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_sede_turno" ADD CONSTRAINT "programa_sede_turno_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_sede_turno" ADD CONSTRAINT "programa_sede_turno_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_inscripcion" ADD CONSTRAINT "programa_inscripcion_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_inscripcion" ADD CONSTRAINT "programa_inscripcion_pro_tur_id_fkey" FOREIGN KEY ("pro_tur_id") REFERENCES "programa_turno"("pro_tur_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_inscripcion" ADD CONSTRAINT "programa_inscripcion_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_inscripcion" ADD CONSTRAINT "programa_inscripcion_pie_id_fkey" FOREIGN KEY ("pie_id") REFERENCES "programa_inscripcion_estado"("pie_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_inscripcion" ADD CONSTRAINT "programa_inscripcion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_baucher" ADD CONSTRAINT "programa_baucher_pi_id_fkey" FOREIGN KEY ("pi_id") REFERENCES "programa_inscripcion"("pi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_restriccion" ADD CONSTRAINT "programa_restriccion_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion_participante" ADD CONSTRAINT "calificacion_participante_pi_id_fkey" FOREIGN KEY ("pi_id") REFERENCES "programa_inscripcion"("pi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion_participante" ADD CONSTRAINT "calificacion_participante_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "programa_modulo"("pm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion_participante" ADD CONSTRAINT "calificacion_participante_pc_id_fkey" FOREIGN KEY ("pc_id") REFERENCES "programa_calificacion"("pc_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion_participante" ADD CONSTRAINT "calificacion_participante_programaModalidadId_fkey" FOREIGN KEY ("programaModalidadId") REFERENCES "programa_modalidad"("pm_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_calificacion" ADD CONSTRAINT "programa_calificacion_pro_tip_id_fkey" FOREIGN KEY ("pro_tip_id") REFERENCES "programa_tipo"("pro_tip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_calificacion" ADD CONSTRAINT "programa_calificacion_ptc_id_fkey" FOREIGN KEY ("ptc_id") REFERENCES "programa_tipo_calificacion"("ptc_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acta_conclusion" ADD CONSTRAINT "acta_conclusion_pi_id_fkey" FOREIGN KEY ("pi_id") REFERENCES "programa_inscripcion"("pi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_et_id_fkey" FOREIGN KEY ("et_id") REFERENCES "tipo_evento"("et_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_inscripcion_v2" ADD CONSTRAINT "evento_inscripcion_v2_eve_per_id_fkey" FOREIGN KEY ("eve_per_id") REFERENCES "evento_personas"("eve_per_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_inscripcion_v2" ADD CONSTRAINT "evento_inscripcion_v2_eve_id_fkey" FOREIGN KEY ("eve_id") REFERENCES "evento"("eve_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_inscripcion_v2" ADD CONSTRAINT "evento_inscripcion_v2_dep_id_fkey" FOREIGN KEY ("dep_id") REFERENCES "departamento"("dep_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_inscripcion_v2" ADD CONSTRAINT "evento_inscripcion_v2_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "programa_modalidad"("pm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_personas" ADD CONSTRAINT "evento_personas_gen_id_fkey" FOREIGN KEY ("gen_id") REFERENCES "genero"("gen_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_restriccion" ADD CONSTRAINT "evento_restriccion_eve_id_fkey" FOREIGN KEY ("eve_id") REFERENCES "evento"("eve_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_cuestionario" ADD CONSTRAINT "evento_cuestionario_eve_id_fkey" FOREIGN KEY ("eve_id") REFERENCES "evento"("eve_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_pregunta" ADD CONSTRAINT "evento_pregunta_eve_cue_id_fkey" FOREIGN KEY ("eve_cue_id") REFERENCES "evento_cuestionario"("eve_cue_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_opciones" ADD CONSTRAINT "evento_opciones_eve_pre_id_fkey" FOREIGN KEY ("eve_pre_id") REFERENCES "evento_pregunta"("eve_pre_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_respuestas" ADD CONSTRAINT "evento_respuestas_eve_pre_id_fkey" FOREIGN KEY ("eve_pre_id") REFERENCES "evento_pregunta"("eve_pre_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_respuestas" ADD CONSTRAINT "evento_respuestas_eve_opc_id_fkey" FOREIGN KEY ("eve_opc_id") REFERENCES "evento_opciones"("eve_opc_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_respuestas" ADD CONSTRAINT "evento_respuestas_eve_per_id_fkey" FOREIGN KEY ("eve_per_id") REFERENCES "evento_personas"("eve_per_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_gen_id_fkey" FOREIGN KEY ("gen_id") REFERENCES "genero"("gen_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_persona" ADD CONSTRAINT "map_persona_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area_trabajo"("area_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_educativa" ADD CONSTRAINT "unidad_educativa_dis_id_fkey" FOREIGN KEY ("dis_id") REFERENCES "distrito"("dis_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog" ADD CONSTRAINT "blog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galeria" ADD CONSTRAINT "galeria_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE SET NULL ON UPDATE CASCADE;
