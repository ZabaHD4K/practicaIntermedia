# Proyecto de Gestión de Usuarios y Compañías

Este proyecto es una aplicación construida con **Node.js** y **Express.js** que permite gestionar usuarios y compañías, utilizando **MongoDB** como base de datos. Incluye funcionalidades como registro, inicio de sesión, autenticación con JWT, y creación de compañías.

## Requisitos Previos

- Node.js (versión 14 o superior)
- Cuenta en MongoDB Atlas o MongoDB instalado localmente

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
│   └── database.js    # Configuración de conexión a MongoDB
├── models
│   ├── User.js        # Modelo de usuario
│   └── Company.js     # Modelo de compañía
├── repositories
│   ├── UserRepository.js     # Lógica de negocio para usuarios
│   └── CompanyRepository.js  # Lógica de negocio para compañías
├── views              # Plantillas EJS
├── .env               # Variables de entorno (no incluido en git)
├── index.js           # Punto de entrada de la aplicación
└── package.json       # Dependencias y scripts
```

## Base de Datos

Este proyecto utiliza MongoDB como base de datos. Puedes usar:

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

#### Compañía
- nif (único)
- nombre
- miembros (array de emails)
- jefe (email del jefe)

## Endpoints

### **1. Inicio**
- **Ruta:** /
- **Método:** GET
- **Descripción:** Devuelve un mensaje de inicio.
- **Respuesta:**
  ```
  inicio
  ```

---

### **2. Login**
- **Ruta:** /login
- **Método:** POST
- **Descripción:** Permite a un usuario iniciar sesión.
- **Cuerpo de la solicitud (JSON):**
  ```json
  {
    "email": "usuario@correo.com",
    "password": "contraseña123"
  }
  ```
- **Respuesta exitosa (200):**
  ```json
  {
    "user": {
      "_id": "id_del_usuario",
      "email": "usuario@correo.com",
      "nombre": "Nombre",
      "apellidos": "Apellidos",
      "nif": "12345678A",
      "direccion": "Dirección"
    },
    "token": "jwt_token_generado"
  }
  ```
- **Errores (401):**
  ```json
  {
    "error": "usuario o contraseña incorrectos"
  }
  ```

---

### **3. Registro**
- **Ruta:** /register
- **Método:** POST
- **Descripción:** Permite registrar un nuevo usuario.
- **Cuerpo de la solicitud (JSON):**
  ```json
  {
    "email": "usuario@example.com",
    "password": "passwordSeguro123",
    "nombre": "Juan",
    "apellidos": "Pérez García",
    "nif": "12345678A",
    "direccion": "Calle Falsa 123, Ciudad, País"
  }
  ```
- **Respuesta exitosa (200):**
  ```json
  {
    "id": "id_del_usuario_creado"
  }
  ```
- **Errores (400):**
  ```json
  {
    "error": "mensaje_de_error"
  }
  ```

---

### **4. Logout**
- **Ruta:** /logout
- **Método:** POST
- **Descripción:** Cierra la sesión del usuario eliminando el token de las cookies.
- **Respuesta exitosa (200):**
  ```
  logout de usuarios
  ```

---

### **5. Vista protegida**
- **Ruta:** /protected
- **Método:** GET
- **Descripción:** Devuelve una lista de usuarios en formato JSON. Solo accesible con un token válido.
- **Requisitos:**
  - El token debe estar almacenado en las cookies.
- **Respuesta exitosa (200):**
  ```json
  [
    {
      "_id": "id_del_usuario",
      "email": "usuario@example.com",
      "nombre": "Nombre",
      "apellidos": "Apellidos",
      "nif": "12345678A",
      "direccion": "Dirección"
    },
    ...
  ]
  ```
- **Errores (401):**
  ```json
  {
    "error": "No autorizado"
  }
  ```

---

### **6. Crear Compañía**
- **Ruta:** /companies/create
- **Método:** POST
- **Descripción:** Permite crear una nueva compañía.
- **Cuerpo de la solicitud (JSON):**
  ```json
  {
    "emailJefe": "jefe@empresa.com",
    "nif": "12345678A",
    "nombre": "Nombre de la Compañía",
    "miembros": ["miembro1@empresa.com", "miembro2@empresa.com"]
  }
  ```
- **Respuesta exitosa (201):**
  ```json
  {
    "_id": "id_de_la_compañía",
    "nif": "12345678A",
    "nombre": "Nombre de la Compañía",
    "miembros": ["miembro1@empresa.com", "miembro2@empresa.com"],
    "jefe": "jefe@empresa.com",
    "createdAt": "2025-04-16T12:00:00.000Z",
    "updatedAt": "2025-04-16T12:00:00.000Z"
  }
  ```
- **Errores (400):**
  ```json
  {
    "error": "mensaje_de_error"
  }
  ```

---

## Middleware

### **Verificación de Token**
- Función: verifyToken
- Descripción: Middleware que verifica si el token JWT es válido. Si no lo es, devuelve un error 401.
- Uso: Protege rutas como /protected.

---

## Dependencias

- **express**: Framework para construir la API.
- **mongoose**: ODM para interactuar con MongoDB.
- **jsonwebtoken**: Para generar y verificar tokens JWT.
- **bcrypt**: Para encriptar contraseñas.
- **cookie-parser**: Para manejar cookies en las solicitudes.
- **dotenv**: Para manejar variables de entorno.
- **ejs**: Motor de plantillas para renderizar vistas.

---

## Configuración de MongoDB Atlas

1. Crea una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un nuevo cluster (puedes usar la opción gratuita)
3. Configura un usuario con permisos de lectura/escritura
4. Configura el acceso de red (IP Whitelist)
5. Obtén la cadena de conexión y colócala en tu archivo `.env`

---

## Notas

- Cambia la clave secreta (JWT_SECRET) en el archivo `.env` por una más segura antes de usar en producción.
- Para entornos de producción, configura correctamente las restricciones de IP en MongoDB Atlas.
- Considera implementar más validaciones y manejo de errores para un entorno de producción.
- No compartas ni incluyas el archivo `.env` en tu repositorio de código.
