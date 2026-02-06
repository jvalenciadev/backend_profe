# Guía de Despliegue del Sistema Ministerial

## 1. Requisitos Previos
- Node.js (v18+)
- Docker y Docker Compose
- NPM

## 2. Instalación
```bash
cd backend
npm install
```

## 3. Base de Datos
Iniciar servicios de infraestructura:
```bash
docker-compose up -d
```
Esto levantará PostgreSQL (Puerto 5432) y Redis (Puerto 6379).

## 4. Migración de Base de Datos
Aplicar el esquema Prisma (Multi-tenant) a la base de datos:
```bash
npx prisma migrate dev --name init --schema=libs/database/prisma/schema.prisma
```
Esto creará las tablas `departamento`, `sede`, `admins`, `programa`, `evento` etc.

## 5. Ejecución
Para desarrollo, iniciar el Gateway y microservicios:
```bash
npx nest start api-gateway --watch
npx nest start auth --watch
npx nest start territorial --watch
# ... iniciar otros servicios según necesidad
```
Nota: Asegúrese de configurar los puertos en `main.ts` de cada microservicio para evitar conflictos si ejecuta todos localmente en modo HTTP híbrido.

## 6. Documentación API
La colección Postman se encuentra en `postman_collection.json`.
Importar en Postman para probar el Login.

## 7. Arquitectura
- **Libs**: 
  - `database`: Contiene Prisma Service y Client compartido.
  - `common`: Guards, Interceptors, DTOs compartidos.
- **Apps**:
  - `auth`: Autenticación, JWT, Roles.
  - `territorial`: Gestión de Departamentos y Sedes.
  - `api-gateway`: Punto de entrada principal.
  - `academic`: Lógica core (Programas, Eventos).

## 8. Multi-tenancy
El sistema usa `tenant_id` (Departamento) en todas las tablas críticas.
El JWT Token incluye `tenantId` para contexto automático.
