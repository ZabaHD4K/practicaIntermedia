# Proyecto de Gestión de Usuarios y Compañías

Este proyecto es una aplicación básica construida con **Node.js** y **Express.js** que permite gestionar usuarios y compañías. Incluye funcionalidades como registro, inicio de sesión, autenticación con JWT, y creación de compañías.

## Instalación

1. Clona este repositorio en tu máquina local.
2. Asegúrate de tener **Node.js** instalado.
3. Instala las dependencias ejecutando:

   npm install

4. Inicia el servidor con:

   node index.js

   El servidor estará disponible en http://localhost:3000.

---

## Endpoints

### **1. Inicio**
- **Ruta:** /
- **Método:** GET
- **Descripción:** Devuelve un mensaje de inicio.
- **Respuesta:**
  inicio

---

### **2. Login**
- **Ruta:** /login
- **Método:** POST
- **Descripción:** Permite a un usuario iniciar sesión.
- **Cuerpo de la solicitud (JSON):**
  {
    "email": "usuario@correo.com",
    "password": "contraseña123"
  }
- **Respuesta exitosa (200):**
  {
    "user": {
      "_id": "id_del_usuario",
      "email": "usuario@correo.com"
    },
    "token": "jwt_token_generado"
  }
- **Errores (401):**
  {
    "error": "usuario o contraseña incorrectos"
  }

---

### **3. Registro**
- **Ruta:** /register
- **Método:** POST
- **Descripción:** Permite registrar un nuevo usuario.
- **Cuerpo de la solicitud (JSON):**
  {
    "email": "usuario@example.com",
    "password": "passwordSeguro123",
    "nombre": "Juan",
    "apellidos": "Pérez García",
    "nif": "12345678A",
    "direccion": "Calle Falsa 123, Ciudad, País"
  }
- **Respuesta exitosa (200):**
  {
    "id": "id_del_usuario_creado"
  }
- **Errores (400):**
  {
    "error": "mensaje_de_error"
  }

---

### **4. Logout**
- **Ruta:** /logout
- **Método:** POST
- **Descripción:** Cierra la sesión del usuario eliminando el token de las cookies.
- **Respuesta exitosa (200):**
  logout de usuarios

---

### **5. Vista protegida**
- **Ruta:** /protected
- **Método:** GET
- **Descripción:** Devuelve un archivo JSON con información de usuarios. Solo accesible con un token válido.
- **Requisitos:**
  - El token debe estar almacenado en las cookies.
- **Errores (401):**
  {
    "error": "No autorizado"
  }

---

### **6. Crear Compañía**
- **Ruta:** /companies/create
- **Método:** POST
- **Descripción:** Permite crear una nueva compañía.
- **Cuerpo de la solicitud (JSON):**
  {
    "emailJefe": "jefe@empresa.com",
    "nif": "12345678A",
    "nombre": "Nombre de la Compañía",
    "miembros": ["miembro1@empresa.com", "miembro2@empresa.com"]
  }
- **Respuesta exitosa (201):**
  {
    "emailJefe": "jefe@empresa.com",
    "nif": "12345678A",
    "nombre": "Nombre de la Compañía",
    "miembros": ["miembro1@empresa.com", "miembro2@empresa.com"]
  }
- **Errores (400):**
  {
    "error": "mensaje_de_error"
  }

---

## Middleware

### **Verificación de Token**
- Función: verifyToken
- Descripción: Middleware que verifica si el token JWT es válido. Si no lo es, devuelve un error 401.
- Uso: Protege rutas como /protected.

---

## Dependencias

- **express**: Framework para construir la API.
- **jsonwebtoken**: Para generar y verificar tokens JWT.
- **cookie-parser**: Para manejar cookies en las solicitudes.
- **ejs**: Motor de plantillas para renderizar vistas.

---

## Notas

- Cambia la clave secreta (SECRET_KEY) en el código por una más segura antes de usar en producción.
- Asegúrate de manejar los errores correctamente en un entorno real.
- Este proyecto es solo un ejemplo básico y no incluye validaciones avanzadas ni cifrado de contraseñas.