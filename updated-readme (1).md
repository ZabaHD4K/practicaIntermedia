# Proyecto de Gestión de Usuarios y Compañías

Este proyecto es una aplicación construida con **Node.js** y **Express.js** que permite gestionar usuarios y compañías, utilizando **MongoDB** como base de datos. Incluye funcionalidades como registro, inicio de sesión, cierre de sesión, autenticación con JWT, y creación de compañías.

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
│   ├── index.ejs      # Página de login y registro
│   ├── logout.ejs     # Panel de usuario con botón de logout
│   └── change-password.ejs # Formulario para cambiar contraseña
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
- isValidated (indica si la cuenta está validada)
- validationCode (código de 6 dígitos para validar la cuenta)
- validationCodeExpires (fecha de expiración del código)

#### Compañía
- nif (único)
- nombre
- miembros (array de emails)
- jefe (email del jefe)

## Flujo de Usuario

### 1. Registro y Validación
1. El usuario accede a `/login-page`
2. Completa el formulario de registro
3. Recibe un código de validación
4. Valida su cuenta usando el código

### 2. Login
1. El usuario introduce sus credenciales en la página de login
2. Si son correctos, recibe un token JWT almacenado en una cookie
3. Es redirigido al panel de usuario

### 3. Panel de Usuario
1. El usuario puede ver su información básica
2. Tiene acceso a funcionalidades como cambiar contraseña
3. Puede cerrar sesión (logout)

### 4. Logout
1. El usuario hace clic en el botón "Cerrar Sesión" en el panel de usuario
2. El sistema elimina la cookie que contiene el token JWT
3. El usuario es redirigido a la página de login

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

### **2. Página de Login/Registro**
- **Ruta:** /login-page
- **Método:** GET
- **Descripción:** Muestra la interfaz para login y registro.
- **Respuesta exitosa (200):**
  - Renderiza la plantilla EJS 'index' con formularios de login y registro

---

### **3. Login**
- **Ruta:** /login
- **Método:** POST
- **Descripción:** Permite a un usuario iniciar sesión. La cuenta debe estar validada.
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
      "direccion": "Dirección",
      "isValidated": true
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
  o
  ```json
  {
    "error": "La cuenta no ha sido validada. Por favor, valida tu cuenta."
  }
  ```

---

### **4. Logout**
- **Ruta:** /logout
- **Método:** POST
- **Descripción:** Cierra la sesión del usuario eliminando el token JWT de las cookies.
- **Requisitos:**
  - El usuario debe haber iniciado sesión (aunque no es obligatorio tener un token válido)
- **Respuesta exitosa (200):**
  ```json
  {
    "message": "Sesión cerrada correctamente"
  }
  ```
- **Como usar:**
  - **Desde la interfaz de usuario:** Navega a `/user-panel` y haz clic en el botón "Cerrar Sesión"
  - **Desde una aplicación frontend:** Realiza una petición POST a `/logout` con `credentials: 'include'`
  - **Usando cURL:**
    ```bash
    curl -X POST http://localhost:3000/logout -H "Content-Type: application/json" --cookie "token=your_jwt_token"
    ```
  - **Usando Postman:** Envía una petición POST a `/logout` y asegúrate de incluir la cookie `token` en la pestaña "Cookies"

---

### **5. Panel de Usuario**
- **Ruta:** /user-panel
- **Método:** GET
- **Descripción:** Muestra el panel de usuario con información básica y opciones como cambiar contraseña y cerrar sesión.
- **Requisitos:**
  - El usuario debe estar autenticado (token JWT válido en las cookies)
- **Respuesta exitosa (200):**
  - Renderiza la plantilla EJS 'logout' que funciona como panel de usuario

---

### **6. Información del Usuario Actual**
- **Ruta:** /api/user/info
- **Método:** GET
- **Descripción:** Devuelve información del usuario autenticado actual.
- **Requisitos:**
  - El usuario debe estar autenticado (token JWT válido en las cookies)
- **Respuesta exitosa (200):**
  ```json
  {
    "_id": "id_del_usuario",
    "email": "usuario@correo.com",
    "nombre": "Nombre",
    "apellidos": "Apellidos",
    "nif": "12345678A",
    "direccion": "Dirección",
    "isValidated": true
  }
  ```
- **Errores (401):**
  ```json
  {
    "error": "No autorizado"
  }
  ```

---

### **7. Registro**
- **Ruta:** /register
- **Método:** POST
- **Descripción:** Permite registrar un nuevo usuario. Se genera un código de validación que debe ser usado para activar la cuenta.
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
- **Respuesta exitosa (201):**
  ```json
  {
    "id": "id_del_usuario_creado",
    "message": "Usuario registrado. Por favor valida tu cuenta con el código enviado a tu email.",
    "validationCode": "123456" // Solo para pruebas, en producción esto se enviaría por email
  }
  ```
- **Errores (400):**
  ```json
  {
    "error": "mensaje_de_error"
  }
  ```

---

### **8. Vista protegida**
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

### **9. Validar Usuario**
- **Ruta:** /api/user/validation
- **Método:** PUT
- **Descripción:** Valida la cuenta de un usuario utilizando el código de 6 dígitos.
- **Cuerpo de la solicitud (JSON):**
  ```json
  {
    "email": "usuario@example.com",
    "code": "123456"
  }
  ```
- **Respuesta exitosa (200):**
  ```json
  {
    "success": true,
    "message": "Usuario validado correctamente"
  }
  ```
- **Errores (400):**
  ```json
  {
    "error": "Código de validación inválido o expirado"
  }
  ```

---

### **10. Reenviar Código de Validación**
- **Ruta:** /api/user/resend-code
- **Método:** POST
- **Descripción:** Genera y envía un nuevo código de validación para un usuario.
- **Cuerpo de la solicitud (JSON):**
  ```json
  {
    "email": "usuario@example.com"
  }
  ```
- **Respuesta exitosa (200):**
  ```json
  {
    "message": "Código de validación reenviado",
    "validationCode": "654321" // Solo para pruebas, en producción esto se enviaría por email
  }
  ```
- **Errores (400):**
  ```json
  {
    "error": "El usuario ya está validado"
  }
  ```

---

### **11. Cambiar Contraseña**
- **Ruta:** /api/user/change-password
- **Método:** POST
- **Descripción:** Permite a un usuario autenticado cambiar su contraseña.
- **Requisitos:**
  - El usuario debe estar autenticado (token JWT válido en las cookies).
- **Cuerpo de la solicitud (JSON):**
  ```json
  {
    "currentPassword": "contraseñaActual123",
    "newPassword": "nuevaContraseña456"
  }
  ```
- **Respuesta exitosa (200):**
  ```json
  {
    "success": true,
    "message": "Contraseña actualizada correctamente"
  }
  ```
- **Errores (400):**
  ```json
  {
    "error": "La contraseña actual es incorrecta"
  }
  ```
  o
  ```json
  {
    "error": "La nueva contraseña debe ser diferente a la actual"
  }
  ```

---

### **12. Página para Cambiar Contraseña**
- **Ruta:** /change-password
- **Método:** GET
- **Descripción:** Muestra un formulario para que el usuario cambie su contraseña.
- **Requisitos:**
  - El usuario debe estar autenticado (token JWT válido en las cookies).
- **Respuesta exitosa (200):**
  - Renderiza la plantilla EJS 'change-password'

---

### **13. Crear Compañía**
- **Ruta:** /companies/create
- **Método:** POST
- **Descripción:** Permite crear una nueva compañía. El jefe y los miembros deben tener cuentas validadas.
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
    "error": "El jefe debe validar su cuenta antes de crear una compañía."
  }
  ```

---

## Middleware

### **Verificación de Token**
- Función: verifyToken
- Descripción: Middleware que verifica si el token JWT es válido. Si no lo es, devuelve un error 401.
- Uso: Protege rutas como /protected, /change-password, /user-panel y /api/user/change-password.

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

## Gestión de Sesiones y Autenticación

### Inicio de Sesión
- Cuando un usuario inicia sesión correctamente, se genera un token JWT.
- Este token se almacena en una cookie HTTP-only para mayor seguridad.
- La cookie se envía automáticamente en cada solicitud al servidor.

### Cierre de Sesión (Logout)
- Para cerrar sesión, la aplicación elimina la cookie que contiene el token JWT.
- Esto se hace mediante una solicitud POST al endpoint `/logout`.
- Después del logout, el usuario es redirigido a la página de login.

#### Cómo implementar el logout en tu aplicación cliente:
```javascript
async function logout() {
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Importante: incluir cookies en la solicitud
    });
    
    if (response.ok) {
      // Redirigir o mostrar mensaje de éxito
      window.location.href = '/login-page';
    } else {
      console.error('Error al cerrar sesión');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

#### Consideraciones sobre el logout:
- Asegúrate de incluir `credentials: 'include'` en la solicitud fetch para que las cookies se envíen.
- El servidor elimina la cookie configurando los mismos parámetros con los que fue creada.
- Es una buena práctica redirigir al usuario a una página pública después del logout.
- Para mayor seguridad, puedes invalidar el token en el servidor (requeriría una implementación adicional).

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