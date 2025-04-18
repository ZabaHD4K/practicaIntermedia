# Proyecto de Gestión Empresarial

Este proyecto es una aplicación completa para la gestión empresarial construida con **Node.js** y **Express.js** que permite administrar usuarios, compañías, clientes, proyectos y albaranes, utilizando **MongoDB** como base de datos. Incluye funcionalidades como registro, autenticación con JWT, gestión de permisos y generación de documentos PDF.

## Requisitos Previos

- Node.js (versión 14 o superior)
- MongoDB Atlas (cuenta en la nube) o MongoDB instalado localmente
- npm (para instalar las dependencias)

## Instalación

1. Clona este repositorio en tu máquina local:
   ```bash
   git clone <url-del-repositorio>
   cd <nombre-del-directorio>
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   - Crea un archivo `.env` en la raíz del proyecto
   - Agrega las siguientes variables:
     ```
     MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/<basededatos>?retryWrites=true&w=majority
     JWT_SECRET=tuclavesecretaparajwt
     ```

4. Inicia el servidor:
   ```bash
   npm run dev
   ```

   El servidor estará disponible en http://localhost:3000.

## Estructura del Proyecto

```
├── config
│   └── database.js          # Configuración de conexión a MongoDB
├── models
│   ├── User.js              # Modelo de usuario
│   ├── Company.js           # Modelo de compañía
│   ├── Client.js            # Modelo de cliente
│   ├── Project.js           # Modelo de proyecto
│   └── Albaran.js           # Modelo de albarán
├── repositories
│   ├── UserRepository.js    # Lógica de negocio para usuarios
│   ├── CompanyRepository.js # Lógica de negocio para compañías
│   ├── ClientRepository.js  # Lógica de negocio para clientes
│   ├── ProjectRepository.js # Lógica de negocio para proyectos
│   └── AlbaranRepository.js # Lógica de negocio para albaranes
├── views                    # Plantillas EJS
│   ├── index.ejs            # Página de login y registro
│   ├── logout.ejs           # Panel de usuario
│   ├── change-password.ejs  # Formulario para cambiar contraseña
│   ├── clients.ejs          # Vista de gestión de clientes
│   └── projects.ejs         # Vista de gestión de proyectos
├── test.js                  # Script de prueba básico
├── test-clients.js          # Script de prueba para clientes
├── test-projects.js         # Script de prueba para proyectos
├── test-albaranes.js        # Script de prueba para albaranes
├── .env                     # Variables de entorno (no incluido en git)
├── index.js                 # Punto de entrada de la aplicación
└── package.json             # Dependencias y scripts
```

## Base de Datos

Este proyecto utiliza MongoDB como base de datos. Se puede usar:

- **MongoDB Atlas**: Servicio de base de datos en la nube (recomendado)
- **MongoDB Local**: Instalación local de MongoDB

### Modelos de Datos

#### Usuario
- email (único)
- password (encriptado)
- nombre
- apellidos
- nif
- direccion
- isValidated (indica si la cuenta está validada)
- validationCode y validationCodeExpires (para validación de cuenta)

#### Compañía
- nif (único)
- nombre
- miembros (array de emails)
- jefe (email del jefe)

#### Cliente
- nombre, apellidos
- email (único)
- telefono
- nif (único)
- direccion
- creador (referencia al usuario que lo creó)
- compania (referencia opcional a una compañía)
- activo (para borrado lógico)

#### Proyecto
- titulo
- descripcion
- fechaInicio, fechaFin
- estado (Pendiente, En progreso, Completado, Cancelado)
- presupuesto
- cliente (referencia al cliente)
- compania (referencia opcional a una compañía)
- creador (referencia al usuario que lo creó)
- activo (para borrado lógico)

#### Albarán
- number (número único de albarán generado automáticamente)
- project (referencia al proyecto)
- client (referencia al cliente)
- createdBy (referencia al usuario que lo creó)
- date (fecha de creación)
- hoursEntries (array de registros de horas)
  - user (email del usuario)
  - hours (cantidad de horas)
  - description (descripción del trabajo)
  - date (fecha del trabajo)
- materialEntries (array de registros de materiales)
  - name (nombre del material)
  - quantity (cantidad)
  - unitPrice (precio unitario)
  - totalPrice (precio total)
  - description (descripción opcional)
- observations (observaciones generales)
- totalHours (calculado automáticamente)
- totalMaterials (calculado automáticamente)
- totalAmount (calculado automáticamente)
- isSigned, signatureDate, signedBy (para el firmado del albarán)
- signatureImage (URL o datos de la imagen de firma)
- status (draft, pending, signed, cancelled)

## Funcionalidades Principales

### Gestión de Usuarios
- Registro de usuarios
- Validación por código de verificación
- Login/Logout con JWT
- Cambio de contraseña
- Perfil de usuario

### Gestión de Compañías
- Creación de compañías con jefe y miembros
- Asignación de permisos basados en roles (jefe, miembro)
- Visualización de compañías asociadas

### Gestión de Clientes
- CRUD completo de clientes
- Asociación a compañías
- Filtrado por creador o compañía

### Gestión de Proyectos
- CRUD completo de proyectos
- Asignación a clientes y compañías
- Control de fechas y estado
- Gestión de presupuestos

### Gestión de Albaranes
- Creación de albaranes para proyectos
- Registro de horas trabajadas
- Registro de materiales utilizados
- Firmado de albaranes
- Generación de PDF de albaranes

## API Endpoints

### Endpoints de Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Página de inicio |
| GET | `/login-page` | Página de login |
| GET | `/user-panel` | Panel de usuario (protegido) |
| GET | `/change-password` | Página de cambio de contraseña (protegido) |
| GET | `/api/user/info` | Obtener información del usuario actual (protegido) |
| POST | `/login` | Iniciar sesión |
| POST | `/register` | Registrar nuevo usuario |
| PUT | `/api/user/validation` | Validar cuenta de usuario |
| POST | `/api/user/resend-code` | Reenviar código de validación |
| POST | `/api/user/change-password` | Cambiar contraseña (protegido) |
| POST | `/logout` | Cerrar sesión |
| GET | `/protected` | Ruta protegida de ejemplo |

### Endpoints de Compañías

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/companies/create` | Crear nueva compañía |
| GET | `/api/companies` | Listar compañías del usuario (protegido) |

### Endpoints de Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/clients` | Crear nuevo cliente (protegido) |
| GET | `/api/clients` | Listar todos los clientes (protegido) |
| GET | `/api/clients/me` | Listar clientes creados por el usuario (protegido) |
| GET | `/api/clients/:id` | Obtener cliente por ID (protegido) |
| PUT | `/api/clients/:id` | Actualizar cliente (protegido) |
| DELETE | `/api/clients/:id` | Eliminar cliente (protegido) |
| GET | `/clients-protected` | Vista de clientes (protegido) |

### Endpoints de Proyectos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/projects` | Crear nuevo proyecto (protegido) |
| GET | `/api/projects` | Listar todos los proyectos (protegido) |
| GET | `/api/projects/me` | Listar proyectos creados por el usuario (protegido) |
| GET | `/api/projects/client/:clientId` | Listar proyectos por cliente (protegido) |
| GET | `/api/projects/:id` | Obtener proyecto por ID (protegido) |
| PUT | `/api/projects/:id` | Actualizar proyecto (protegido) |
| DELETE | `/api/projects/:id` | Eliminar proyecto (protegido) |
| GET | `/projects-protected` | Vista de proyectos (protegido) |

### Endpoints de Albaranes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/albaranes` | Crear nuevo albarán (protegido) |
| GET | `/api/albaranes` | Listar todos los albaranes (protegido) |
| GET | `/api/albaranes/:id` | Obtener albarán por ID (protegido) |
| GET | `/api/albaranes/pdf/:id` | Generar PDF del albarán (protegido) |
| PUT | `/api/albaranes/:id` | Actualizar albarán (protegido) |
| DELETE | `/api/albaranes/:id` | Eliminar/cancelar albarán (protegido) |

## Reglas de Negocio

### Usuarios
- Las contraseñas se almacenan encriptadas
- Los usuarios deben validar su cuenta con un código antes de usar la aplicación
- El sistema usa JWT para mantener la sesión

### Compañías
- Una compañía tiene un jefe y puede tener múltiples miembros
- Solo el jefe puede realizar ciertas acciones administrativas

### Clientes
- Un cliente puede estar asociado a una compañía
- Los clientes pueden ser gestionados por cualquier miembro de la compañía asociada

### Proyectos
- Un proyecto siempre está asociado a un cliente
- Opcionalmente puede estar asociado a una compañía
- Los proyectos tienen un ciclo de vida con diferentes estados

### Albaranes
- Un albarán está siempre asociado a un proyecto
- Puede contener registros de horas, materiales o ambos
- Una vez firmado, no se puede modificar ni eliminar
- Solo se pueden generar PDFs de albaranes firmados

## Pruebas (Tests)

El proyecto incluye varios scripts de prueba para verificar el funcionamiento de la API:

### Test básico
```bash
node test.js
```
Prueba el registro, validación, login y creación de compañía.

### Test de clientes
```bash
node test-clients.js
```
Prueba la creación, lectura, actualización y eliminación de clientes.

### Test de proyectos
```bash
node test-projects.js
```
Prueba la creación, lectura, actualización y eliminación de proyectos.

### Test de albaranes
```bash
node test-albaranes.js
```
Prueba la creación, lectura, actualización, firmado, generación de PDF y eliminación de albaranes.

## Autenticación y Seguridad

### JWT (JSON Web Tokens)
- Al iniciar sesión, se genera un token JWT que se almacena en una cookie HTTP-only
- El token contiene el ID y email del usuario
- Todas las rutas protegidas verifican la validez del token
- Al cerrar sesión, la cookie se elimina

### Middleware de verificación
```javascript
function verifyToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ error: 'No autorizado' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY', (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: 'No autorizado' });
        }
        req.user = decoded;
        next();
    });
}
```

## Generación de PDF

El sistema utiliza la librería PDFKit para generar documentos PDF de los albaranes firmados.

```javascript
// Instalar PDFKit
npm install pdfkit
```

La generación del PDF incluye:
- Información del cliente
- Información del proyecto
- Detalles de horas trabajadas
- Detalles de materiales utilizados
- Observaciones
- Firma y datos de validación

## Dependencias Principales

- **express**: Framework para construir la API
- **mongoose**: ODM para interactuar con MongoDB
- **jsonwebtoken**: Para generar y verificar tokens JWT
- **bcrypt**: Para encriptar contraseñas
- **cookie-parser**: Para manejar cookies
- **dotenv**: Para manejar variables de entorno
- **ejs**: Motor de plantillas para las vistas
- **pdfkit**: Para generar documentos PDF

## Posibles Mejoras

1. Implementar sistema de roles más completo
2. Añadir validación más robusta en todas las entradas
3. Implementar tests unitarios y de integración automatizados
4. Mejorar el manejo de errores y logging
5. Añadir generación de reportes y estadísticas
6. Implementar un frontend más completo (React, Angular, Vue)
7. Añadir sistema de notificaciones

## Notas Finales

- Cambia la clave secreta (JWT_SECRET) en el archivo `.env` por una más segura antes de usar en producción
- Configura correctamente las restricciones de IP en MongoDB Atlas
- No compartas ni incluyas el archivo `.env` en tu repositorio
- Para entornos de producción, considera implementar HTTPS
