-- CreateTable
CREATE TABLE "verificacion_codigos" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verificacion_codigos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verificacion_codigos_correo_idx" ON "verificacion_codigos"("correo");
