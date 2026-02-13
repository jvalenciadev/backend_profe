# 📗 Biblia de Integración Frontend - PROGRAMA PROFE v4.0 (Full Schema Spec)

Esta documentación es la **referencia definitiva** para el desarrollo del Frontend. Contiene el listado completo de campos disponibles en la base de datos para cada entidad, permitiendo al desarrollador frontend utilizar cualquiera de ellos según lo requiera la UI.

---

## 🔐 1. Estándares Globales
- **Protocolo:** HTTP/REST
- **Base URL:** `http://localhost:3000`
- **Seguridad Obligatoria:** Header `X-SECRET: profe_secret_2026`
- **Sesión:** Header `Authorization: Bearer <TOKEN>`

---

## 🌍 2. Módulo Territorial

### Departamento (`/departments`)
- `nombre`: String (Único)
- `abreviacion`: String (Único, ej: "LP", "SC")
- `estado`: Enum (ACTIVO, INACTIVO)

### Sede (`/sedes`)
Campos disponibles para Formularios y Vistas:
- `nombre`: String (Requerido)
- `nombreAbre`: String? (Opcional)
- `descripcion`: String (Text/HTML)
- `imagen`: String? (URL)
- `nombreResp1`: String?
- `cargoResp1`: String?
- `imagenResp1`: String? (URL)
- `nombreResp2`: String?
- `cargoResp2`: String?
- `imagenResp2`: String? (URL)
- `contacto1`: Int
- `contacto2`: Int?
- `facebook`: String?
- `tiktok`: String?
- `whatsapp`: String?
- `horario`: String
- `turno`: String
- `ubicacion`: String (Dirección detallada)
- `latitud`: Decimal?
- `longitud`: Decimal?
- `departamentoId`: UUID (Relación obligatoria)

### Distrito (`/distritos`)
- `nombre`: String
- `codigo`: Int
- `departamentoId`: UUID

### Provincia (`/provincias`)
- `nombre`: String

### Unidad Educativa (`/unidades-educativas`)
- `nombre`: String
- `codigoSie`: Int?
- `distritoId`: UUID

---

## 👤 3. Módulo Usuarios y Seguridad

### Usuario / Administrador (`/users`)
Campos disponibles (Modelo BD: `admins`):
- `nombre`: String
- `apellidos`: String
- `username`: String (Único)
- `correo`: String (Único)
- `password`: String (Requerido en creación)
- `imagen`: String? (URL Foto perfil)
- `genero`: String? (Default: "No prefiero decirlo")
- `licenciatura`: String?
- `direccion`: String?
- `curriculum`: String? (URL PDF o Texto)
- `fechaNacimiento`: String?
- `estadoCivil`: String?
- `facebook`: String?
- `tiktok`: String?
- `cargo`: String?
- `celular`: Int?
- `tenantId`: UUID? (Departamento asignado)
- `personaId`: UUID? (Relación con MapPersona)
- `roleId`: UUID? (Rol principal)
- `sedeIds`: String? (JSON para asignar múltiples sedes)
- `proIds`: String? (JSON para asignar múltiples programas)

### Rol (`/roles`)
- `name`: String
- `guardName`: String (Default: "web")
- `permissions`: Array (Al crear/editar, enviar lista de permisos)

### Permiso (`/permissions`)
- `name`: String
- `action`: String
- `subject`: String
- `conditions`: JSON
- `fields`: JSON (Campos restringidos)

### Personas (`/personas` - `map_persona`)
- `nombre1`, `nombre2`: String
- `apellido1`, `apellido2`: String
- `ci`: String
- `complemento`: String?
- `fechaNacimiento`: Date
- `celular`: Int?
- `correo`: String?
- `generoId`: UUID
- `areaTrabajoId`: UUID
- `unidadEducativaId`: UUID

---

## 🎓 4. Módulo Académico

### Programa (`/programas`)
- `codigo`: String?
- `nombre`: String
- `nombreAbre`: String?
- `contenido`: String (HTML)
- `horario`: String?
- `cargaHoraria`: Int
- `costo`: Int
- `banner`: String (URL)
- `afiche`: String (URL)
- `convocatoria`: String? (URL)
- `fechaIniIns`: Date
- `fechaFinIns`: Date
- `fechaIniClase`: Date
- `estadoInscripcion`: Boolean (Default: true)
- `duracionId`: UUID
- `versionId`: UUID
- `tipoId`: UUID
- `modalidadId`: UUID
- `tenantId`: UUID

### Módulo Académico (`/modulos`)
- `codigo`: String?
- `nombre`: String
- `descripcion`: String
- `notaMinima`: Int
- `fechaInicio`: Date
- `fechaFin`: Date
- `programaId`: UUID

### Inscripción (`/inscripciones`)
- `docDigital`: String? (URL Documento)
- `certificacion`: Boolean?
- `entregoCert`: Boolean?
- `folio`: UUID?
- `partida`: UUID?
- `carton`: UUID?
- `licenciatura`: String?
- `unidadEducativa`: String?
- `nivel`: String?
- `subsistema`: String?
- `materia`: String?
- `observacion`: String?
- `programaId`: UUID
- `turnoId`: UUID
- `sedeId`: UUID
- `estadoInscripcionId`: UUID
- `personaId`: UUID
- `tenantId`: UUID?

### Baucher (`/bauchers`)
- `imagen`: String (URL)
- `nroDeposito`: String?
- `monto`: Int
- `fecha`: Date
- `tipoPago`: String
- `confirmado`: Boolean?
- `fechaConf`: Date?
- `inscripcionId`: UUID

---

## 🎫 5. Módulo de Eventos

### Evento (`/eventos`)
- `nombre`: String
- `codigo`: String?
- `descripcion`: String
- `banner`: String
- `afiche`: String
- `modulosIds`: String (JSON)
- `fecha`: Date
- `inscripcion`: Boolean
- `asistencia`: Boolean?
- `lugar`: String
- `totalInscrito`: Int
- `tipoId`: UUID
- `tenantId`: UUID

### Participante Evento (`/evento-persona`)
- `ci`: String
- `complemento`: String
- `expedido`: String
- `nombre1`, `nombre2`: String
- `apellido1`, `apellido2`: String
- `fechaNac`: Date
- `correo`: String
- `celular`: String
- `generoId`: UUID

### Inscripción Evento (`/eventos-inscripciones`)
- `asistencia`: Boolean
- `nroDeposito`: String?
- `fechaDeposito`: Date?
- `imagenDeposito`: String?
- `eventoPersonId`: UUID
- `eventoId`: UUID
- `departamentoId`: UUID
- `modalidadId`: UUID

---

## 📰 6. Módulo Multimedia y CMS

### Blog (`/blog`)
- `titulo`: String
- `slug`: String
- `contenido`: String (HTML)
- `imagen`: String?
- `fecha`: Date
- `vistas`: Int
- `tenantId`: UUID?

### Comunicado (`/comunicados`)
- `titulo`: String
- `descripcion`: String
- `imagen`: String?
- `fecha`: Date
- `prioridad`: Int
- `tenantId`: UUID?

### Galería (`/galerias`)
- `titulo`: String
- `descripcion`: String?
- `imagen`: String
- `sedeId`: UUID?

### Video (`/videos`)
- `titulo`: String
- `descripcion`: String?
- `url`: String

---

## ⚙️ 7. Configuración y Auxiliares

### Género (`/generos`)
- `nombre`: String

### Área de Trabajo (`/areas`)
- `nombre`: String

---
**Nota Final:** Todos los campos marcados con `?` son opcionales. Los campos de tipo `Date` deben enviarse en formato ISO 8601. Los campos JSON se deben enviar como string o objeto según lo soporte el endpoint (generalmente objeto en body JSON).
