# API de Gestión de Albaranes

Este proyecto implementa una API RESTful para la gestión de albaranes (partes de horas o materiales) entre clientes y proveedores, desarrollada con Node.js, Express y MongoDB.

## Índice
1. [Requisitos previos](#requisitos-previos)
2. [Instalación](#instalación)
3. [Configuración](#configuración)
4. [Pruebas de funcionalidad](#pruebas-de-funcionalidad)
   - [1. Registro y autenticación de usuarios](#1-registro-y-autenticación-de-usuarios)
   - [2. Gestión de compañías](#2-gestión-de-compañías)
   - [3. Gestión de clientes](#3-gestión-de-clientes)
   - [4. Gestión de proyectos](#4-gestión-de-proyectos)
   - [5. Gestión de albaranes](#5-gestión-de-albaranes)
   - [6. Generación de PDFs](#6-generación-de-pdfs)
5. [Pruebas automatizadas](#pruebas-automatizadas)
6. [Documentación de la API](#documentación-de-la-api)

## Requisitos previos

- Node.js (versión 14.0.0 o superior)
- MongoDB (local o MongoDB Atlas)
- npm o yarn

## Instalación

1. Clona este repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd <nombre-del-directorio>
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/albaranes-api
   JWT_SECRET=tu_clave_secreta_para_jwt
   ```

## Configuración

Asegúrate de configurar correctamente la conexión a MongoDB:
- Para MongoDB local: `MONGODB_URI=mongodb://localhost:27017/albaranes-api`
- Para MongoDB Atlas: `MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority`

## Pruebas de funcionalidad

A continuación se describe cómo probar cada una de las funcionalidades requeridas en la práctica. Puedes usar herramientas como Postman, Insomnia o la extensión REST Client de VS Code para realizar las pruebas.

### 1. Registro y autenticación de usuarios

#### 1.1 Registro de usuario
```http
POST http://localhost:3000/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "nombre": "Usuario",
  "apellidos": "De Prueba",
  "nif": "12345678Z",
  "direccion": "Calle de Prueba, 123"
}
```

**Comprobar**: La respuesta debe incluir un mensaje de éxito, el ID del usuario y un código de validación.

#### 1.2 Validación de usuario
```http
PUT http://localhost:3000/api/user/validation
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "code": "123456" // Usar el código recibido en la respuesta anterior
}
```

**Comprobar**: La respuesta debe indicar que el usuario ha sido validado correctamente.

#### 1.3 Login
```http
POST http://localhost:3000/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Comprobar**: La respuesta debe incluir los datos del usuario y un token JWT. Guarda este token para usarlo en las siguientes peticiones.

#### 1.4 Obtener información del usuario
```http
GET http://localhost:3000/api/user/info
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar la información del usuario sin datos sensibles como la contraseña.

#### 1.5 Cambiar contraseña
```http
POST http://localhost:3000/api/user/change-password
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "currentPassword": "contraseña123",
  "newPassword": "nuevaContraseña123"
}
```

**Comprobar**: La respuesta debe indicar que la contraseña ha sido cambiada correctamente.

#### 1.6 Logout
```http
POST http://localhost:3000/logout
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe indicar que la sesión ha sido cerrada correctamente. Inicia sesión nuevamente para continuar con las pruebas.

### 2. Gestión de compañías

#### 2.1 Crear compañía
```http
POST http://localhost:3000/companies/create
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "emailJefe": "usuario@ejemplo.com",
  "nif": "B12345678",
  "nombre": "Compañía de Prueba S.L.",
  "miembros": ["usuario@ejemplo.com"]
}
```

**Comprobar**: La respuesta debe incluir los datos de la compañía creada, incluyendo su ID.

#### 2.2 Obtener compañías asociadas al usuario
```http
GET http://localhost:3000/api/companies
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar las compañías donde el usuario es jefe o miembro.

### 3. Gestión de clientes

#### 3.1 Crear cliente
```http
POST http://localhost:3000/api/clients
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "nombre": "Cliente",
  "apellidos": "De Prueba",
  "email": "cliente@ejemplo.com",
  "telefono": "666777888",
  "nif": "98765432X",
  "direccion": "Calle Cliente, 456",
  "companiaId": "<id_de_la_compañía>"
}
```

**Comprobar**: La respuesta debe incluir los datos del cliente creado, incluyendo su ID.

#### 3.2 Obtener todos los clientes
```http
GET http://localhost:3000/api/clients
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar la lista de clientes activos.

#### 3.3 Obtener clientes creados por el usuario
```http
GET http://localhost:3000/api/clients/me
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar solo los clientes creados por el usuario autenticado.

#### 3.4 Obtener cliente por ID
```http
GET http://localhost:3000/api/clients/<id_del_cliente>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar los datos del cliente específico.

#### 3.5 Actualizar cliente
```http
PUT http://localhost:3000/api/clients/<id_del_cliente>
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "telefono": "999888777",
  "direccion": "Nueva Dirección, 789"
}
```

**Comprobar**: La respuesta debe mostrar los datos del cliente actualizados.

#### 3.6 Eliminar cliente (soft delete)
```http
DELETE http://localhost:3000/api/clients/<id_del_cliente>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe indicar que el cliente ha sido eliminado correctamente. Verifica que ya no aparece en el listado de clientes activos.

### 4. Gestión de proyectos

#### 4.1 Crear proyecto
```http
POST http://localhost:3000/api/projects
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "titulo": "Proyecto de Prueba",
  "descripcion": "Este es un proyecto de prueba para probar la API",
  "fechaInicio": "2023-06-01",
  "fechaFin": "2023-12-31",
  "estado": "En progreso",
  "presupuesto": 5000,
  "clienteId": "<id_del_cliente>",
  "companiaId": "<id_de_la_compañía>"
}
```

**Comprobar**: La respuesta debe incluir los datos del proyecto creado, incluyendo su ID.

#### 4.2 Obtener todos los proyectos
```http
GET http://localhost:3000/api/projects
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar la lista de proyectos activos.

#### 4.3 Obtener proyectos creados por el usuario
```http
GET http://localhost:3000/api/projects/me
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar solo los proyectos creados por el usuario autenticado.

#### 4.4 Obtener proyectos por cliente
```http
GET http://localhost:3000/api/projects/client/<id_del_cliente>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar solo los proyectos asociados al cliente especificado.

#### 4.5 Obtener proyecto por ID
```http
GET http://localhost:3000/api/projects/<id_del_proyecto>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar los datos del proyecto específico.

#### 4.6 Actualizar proyecto
```http
PUT http://localhost:3000/api/projects/<id_del_proyecto>
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "estado": "Completado",
  "presupuesto": 6000
}
```

**Comprobar**: La respuesta debe mostrar los datos del proyecto actualizados.

#### 4.7 Eliminar proyecto (soft delete)
```http
DELETE http://localhost:3000/api/projects/<id_del_proyecto>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe indicar que el proyecto ha sido eliminado correctamente. Verifica que ya no aparece en el listado de proyectos activos.

### 5. Gestión de albaranes

#### 5.1 Crear albarán
```http
POST http://localhost:3000/api/albaranes
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "projectId": "<id_del_proyecto>",
  "hoursEntries": [
    {
      "user": "usuario@ejemplo.com",
      "hours": 8,
      "description": "Desarrollo de funcionalidades"
    }
  ],
  "materialEntries": [
    {
      "name": "Material de oficina",
      "quantity": 2,
      "unitPrice": 15.5,
      "totalPrice": 31
    }
  ],
  "observations": "Este es un albarán de prueba"
}
```

**Comprobar**: La respuesta debe incluir los datos del albarán creado, incluyendo su ID y número único.

#### 5.2 Obtener todos los albaranes
```http
GET http://localhost:3000/api/albaranes
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar la lista de albaranes.

#### 5.3 Obtener albarán por ID
```http
GET http://localhost:3000/api/albaranes/<id_del_albaran>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe mostrar los datos del albarán específico, incluyendo información del cliente, proyecto y entradas de horas y materiales.

#### 5.4 Firmar albarán
```http
PUT http://localhost:3000/api/albaranes/<id_del_albaran>
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "isSigned": true,
  "signedBy": "usuario@ejemplo.com",
  "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
}
```

**Comprobar**: La respuesta debe mostrar el albarán actualizado con los datos de firma y el estado cambiado a "signed".

### 6. Generación de PDFs

#### 6.1 Generar PDF de albarán firmado
```http
GET http://localhost:3000/api/albaranes/pdf/<id_del_albaran>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe ser un archivo PDF descargable con toda la información del albarán, incluyendo datos del cliente, proyecto, horas, materiales y firma.

#### 6.2 Intentar generar PDF de albarán no firmado
```http
# Primero crea un nuevo albarán sin firmarlo
POST http://localhost:3000/api/albaranes
Cookie: token=<token_jwt_obtenido_en_el_login>
Content-Type: application/json

{
  "projectId": "<id_del_proyecto>",
  "hoursEntries": [
    {
      "user": "usuario@ejemplo.com",
      "hours": 4,
      "description": "Trabajo adicional"
    }
  ],
  "observations": "Albarán sin firmar"
}
```

```http
# Luego intenta generar el PDF
GET http://localhost:3000/api/albaranes/pdf/<id_del_nuevo_albaran>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe ser un error indicando que solo se pueden generar PDFs de albaranes firmados.

#### 6.3 Eliminar albarán

##### 6.3.1 Intentar eliminar albarán firmado
```http
DELETE http://localhost:3000/api/albaranes/<id_del_albaran_firmado>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe ser un error indicando que no se puede eliminar un albarán que ya ha sido firmado.

##### 6.3.2 Eliminar albarán sin firmar
```http
DELETE http://localhost:3000/api/albaranes/<id_del_albaran_sin_firmar>
Cookie: token=<token_jwt_obtenido_en_el_login>
```

**Comprobar**: La respuesta debe indicar que el albarán ha sido cancelado correctamente. El albarán no se elimina físicamente, sino que cambia su estado a "cancelled".

## Pruebas automatizadas

El proyecto incluye pruebas automatizadas con Jest para verificar el correcto funcionamiento de los repositorios. Puedes ejecutarlas con los siguientes comandos:

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas específicas
npm run test:clients    # Pruebas de clientes
npm run test:projects   # Pruebas de proyectos
npm run test:albaranes  # Pruebas de albaranes
```

## Documentación de la API

La API está documentada con Swagger y puedes acceder a la documentación interactiva en:

```
http://localhost:3000/api-docs
```

Esta interfaz te permitirá probar todos los endpoints de la API desde el navegador.

---

## Nota sobre la estructura del proyecto

El proyecto sigue una arquitectura basada en repositorios:

- **models/**: Modelos de MongoDB/Mongoose
- **repositories/**: Lógica de negocio
- **views/**: Vistas EJS para las páginas web
- **tests/**: Pruebas automatizadas
- **config/**: Configuraciones
- **pdfs/**: Directorio donde se almacenan los PDFs generados