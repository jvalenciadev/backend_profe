const fs = require('fs');

const collection = {
    info: {
        name: "Profe Backend API (Full Monolith)",
        description: "Colección completa de todas las APIs CRUD del sistema Profe (Consolidado en Puerto 3000)",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
        {
            name: "Auth & Sesión",
            item: [
                {
                    name: "Login",
                    request: {
                        method: "POST",
                        header: [{ key: "Content-Type", value: "application/json" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ username: "admin", password: "password123" }, null, 2)
                        },
                        url: "http://localhost:3000/auth/login"
                    }
                }
            ]
        },
        {
            name: "Territorial (Territorio y Sedes)",
            item: [
                generateFolder("Departamentos", "http://localhost:3000/departments", { nombre: "LA PAZ", abreviacion: "LP" }),
                generateFolder("Sedes", "http://localhost:3000/sedes", { nombre: "Sede Centro", departamentoId: 1, descripcion: "Ubicación central", horario: "08:00 - 18:00", turno: "Mañana", ubicacion: "Calle 123", contacto1: 77777777 }),
                generateFolder("Distritos", "http://localhost:3000/distritos", { nombre: "Distrito 1", codigo: 101, departamentoId: 1 }),
                generateFolder("Provincias", "http://localhost:3000/provincias", { nombre: "Cercado", departamentoId: 1 }),
                generateFolder("Unidades Educativas", "http://localhost:3000/unidades-educativas", { nombre: "U.E. Bolivia", codigo: 1001, distritoId: 1 })
            ]
        },
        {
            name: "Usuarios y Permisos",
            item: [
                generateFolder("Usuarios", "http://localhost:3000/users", { username: "docente1", nombre: "Juan", apellidos: "Perez", correo: "juan@profe.bo", password: "password123", tenantId: 1 }),
                generateFolder("Roles", "http://localhost:3000/roles", { name: "FACILITADOR", guardName: "web" }),
                generateFolder("Permisos", "http://localhost:3000/permissions", { name: "create_academic", guardName: "web", groupName: "Academic" }),
                generateFolder("Personas (MAP)", "http://localhost:3000/personas", { ci: 1234567, nombre1: "Juan", apellido1: "Perez", generoId: 1, areaId: 1, fechaNac: "1990-01-01T00:00:00Z" }),
                generateFolder("Areas de Trabajo", "http://localhost:3000/areas", { nombre: "SISTEMAS" }),
                generateFolder("Géneros", "http://localhost:3000/generos", { nombre: "Masculino" })
            ]
        },
        {
            name: "Académico (Programas y Cursos)",
            item: [
                generateFolder("Programas", "http://localhost:3000/programas", {
                    nombre: "Diplomado en IA",
                    codigo: "IA001",
                    cargaHoraria: 200,
                    costo: 1500,
                    duracionId: 1,
                    versionId: 1,
                    tipoId: 1,
                    modalidadId: 1,
                    contenido: "Contenido del programa",
                    banner: "banner.jpg",
                    afiche: "afiche.jpg",
                    fechaIniIns: "2024-01-01T00:00:00Z",
                    fechaFinIns: "2024-12-31T23:59:59Z",
                    fechaIniClase: "2024-02-01T00:00:00Z",
                    tenantId: 1
                }),
                generateFolder("Módulos", "http://localhost:3000/modulos", { nombre: "Módulo 1", programaId: 1, descripcion: "Introducción", fechaInicio: "2024-03-01T00:00:00Z", fechaFin: "2023-04-01T00:00:00Z" }),
                generateFolder("Duraciones", "http://localhost:3000/duraciones", { nombre: "4 Semanas", semana: 4 }),
                generateFolder("Versiones", "http://localhost:3000/versiones", { nombre: "Versión 1", numero: 1, romano: "I", gestion: "2024" }),
                generateFolder("Tipos de Programa", "http://localhost:3000/tipos", { nombre: "Diplomado" }),
                generateFolder("Modalidades", "http://localhost:3000/modalidades", { nombre: "Virtual" }),
                generateFolder("Turnos", "http://localhost:3000/turnos", { nombre: "Noche", descripcion: "19:00 - 21:00" }),
                generateFolder("Estados de Inscripción", "http://localhost:3000/estados-inscripcion", { nombre: "INSCRITO" }),
                generateFolder("Inscripciones", "http://localhost:3000/inscripciones", { programaId: 1, personaId: 1, sedeId: 1, turnoId: 1, estadoInscripcionId: 1 }),
                generateFolder("Bauchers", "http://localhost:3000/bauchers", { inscripcionId: 1, monto: 1500, numeroDeposito: "DEP-123", fechaDeposito: "2024-01-15T00:00:00Z" }),
                generateFolder("Calificaciones", "http://localhost:3000/calificaciones", { inscripcionId: 1, moduloId: 1, nota: 85 })
            ]
        },
        {
            name: "Eventos y Socialización",
            item: [
                generateFolder("Eventos", "http://localhost:3000/eventos", { nombre: "Congreso 2024", codigo: "CONG-24", descripcion: "Congreso Educativo", fecha: "2024-10-10T00:00:00Z", lugar: "La Paz", tipoId: 1, tenantId: 1 }),
                generateFolder("Tipos de Evento", "http://localhost:3000/tipos-evento", { nombre: "Seminario" }),
                generateFolder("Participantes Eventos", "http://localhost:3000/evento-persona", { eventoId: 1, personaId: 1 })
            ]
        },
        {
            name: "Auditoría",
            item: [
                generateFolder("Logs de Auditoría", "http://localhost:3000/audit-logs", {})
            ]
        }
    ]
};

function generateFolder(name, url, itemData) {
    return {
        name: name,
        item: [
            {
                name: `Listar ${name}`,
                request: { method: "GET", url: url }
            },
            {
                name: `Obtener único ${name}`,
                request: { method: "GET", url: `${url}/1` }
            },
            {
                name: `Crear ${name}`,
                request: {
                    method: "POST",
                    header: [{ key: "Content-Type", value: "application/json" }],
                    body: { mode: "raw", raw: JSON.stringify(itemData, null, 2) },
                    url: url
                }
            },
            {
                name: `Actualizar ${name}`,
                request: {
                    method: "PUT",
                    header: [{ key: "Content-Type", value: "application/json" }],
                    body: { mode: "raw", raw: JSON.stringify(itemData, null, 2) },
                    url: `${url}/1`
                }
            },
            {
                name: `Eliminar ${name}`,
                request: { method: "DELETE", url: `${url}/1` }
            }
        ]
    };
}

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));
console.log('✅ Postman collection completa generada con éxito.');
