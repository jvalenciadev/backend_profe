-- CreateEnum
CREATE TYPE "Status" AS ENUM ('activo', 'inactivo', 'eliminado');

-- CreateTable
CREATE TABLE "departamento" (
    "dep_id" BIGSERIAL NOT NULL,
    "dep_nombre" TEXT NOT NULL,
    "dep_abreviacion" TEXT NOT NULL,
    "dep_estado" "Status" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,

    CONSTRAINT "departamento_pkey" PRIMARY KEY ("dep_id")
);

-- CreateTable
CREATE TABLE "sede" (
    "sede_id" BIGSERIAL NOT NULL,
    "sede_nombre" TEXT NOT NULL,
    "sede_nombre_abre" TEXT,
    "sede_ubicacion" TEXT NOT NULL,
    "sede_estado" "Status" NOT NULL DEFAULT 'activo',
    "dep_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("sede_id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "estado" "Status" NOT NULL DEFAULT 'activo',
    "tenant_id" BIGINT,
    "per_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "guard_name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "guard_name" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_has_roles" (
    "model_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "model_type" TEXT NOT NULL DEFAULT 'App\User',

    CONSTRAINT "model_has_roles_pkey" PRIMARY KEY ("model_id","role_id")
);

-- CreateTable
CREATE TABLE "role_has_permissions" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,

    CONSTRAINT "role_has_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_has_sedes" (
    "user_id" BIGINT NOT NULL,
    "sede_id" BIGINT NOT NULL,

    CONSTRAINT "user_has_sedes_pkey" PRIMARY KEY ("user_id","sede_id")
);

-- CreateTable
CREATE TABLE "map_persona" (
    "per_id" BIGSERIAL NOT NULL,
    "per_ci" BIGINT NOT NULL,
    "per_complemento" TEXT,
    "per_nombre1" TEXT,
    "per_apellido1" TEXT,
    "per_fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "per_celular" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "map_persona_pkey" PRIMARY KEY ("per_id")
);

-- CreateTable
CREATE TABLE "programa" (
    "pro_id" BIGSERIAL NOT NULL,
    "pro_nombre" TEXT NOT NULL,
    "pro_codigo" TEXT,
    "pro_estado" "Status" NOT NULL DEFAULT 'activo',
    "tenant_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,

    CONSTRAINT "programa_pkey" PRIMARY KEY ("pro_id")
);

-- CreateTable
CREATE TABLE "programa_sede_turno" (
    "psp_id" BIGSERIAL NOT NULL,
    "sede_id" BIGINT NOT NULL,
    "pro_id" BIGINT NOT NULL,
    "pro_cupo" INTEGER NOT NULL,

    CONSTRAINT "programa_sede_turno_pkey" PRIMARY KEY ("psp_id")
);

-- CreateTable
CREATE TABLE "programa_inscripcion" (
    "pi_id" BIGSERIAL NOT NULL,
    "pro_id" BIGINT NOT NULL,
    "sede_id" BIGINT NOT NULL,
    "per_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,

    CONSTRAINT "programa_inscripcion_pkey" PRIMARY KEY ("pi_id")
);

-- CreateTable
CREATE TABLE "evento" (
    "eve_id" BIGSERIAL NOT NULL,
    "eve_nombre" TEXT NOT NULL,
    "eve_descripcion" TEXT NOT NULL,
    "eve_fecha" TIMESTAMP(3) NOT NULL,
    "eve_estado" "Status" NOT NULL DEFAULT 'activo',
    "tenant_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "evento_pkey" PRIMARY KEY ("eve_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "userId" BIGINT,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" BIGINT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_correo_key" ON "admins"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "admins_per_id_key" ON "admins"("per_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- AddForeignKey
ALTER TABLE "sede" ADD CONSTRAINT "sede_dep_id_fkey" FOREIGN KEY ("dep_id") REFERENCES "departamento"("dep_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_per_id_fkey" FOREIGN KEY ("per_id") REFERENCES "map_persona"("per_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_sedes" ADD CONSTRAINT "user_has_sedes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_sedes" ADD CONSTRAINT "user_has_sedes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa" ADD CONSTRAINT "programa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_sede_turno" ADD CONSTRAINT "programa_sede_turno_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("sede_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_sede_turno" ADD CONSTRAINT "programa_sede_turno_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_inscripcion" ADD CONSTRAINT "programa_inscripcion_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "programa"("pro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "departamento"("dep_id") ON DELETE SET NULL ON UPDATE CASCADE;
