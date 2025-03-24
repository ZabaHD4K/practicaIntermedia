# Proyecto de Autenticación y Autorización

Este proyecto implementa un sistema de autenticación y autorización utilizando una base de datos local debido a problemas de conexión con MongoDB.

## Tecnologías Utilizadas

- **Base de datos local**: Almacena los usuarios y sus contraseñas.
- **bcrypt**: Utilizado para guardar las contraseñas cifradas en un hash.
- **EJS**: Motor de plantillas para renderizar las vistas.
- **JWT (JSON Web Tokens)**: Para controlar el acceso a las rutas protegidas.
- **Cookies**: Para gestionar la sesión de los usuarios.

## Funcionalidades

- **Usuarios en base de datos local**: Los usuarios se almacenan en una base de datos local. Puedes ver los usuarios en la ruta `/protected`, que está protegida.
- **Contraseñas hasheadas**: Las contraseñas se guardan de forma segura utilizando bcrypt.
- **Sesión de usuarios con cookies**: Las sesiones de los usuarios se gestionan mediante cookies.
- **Interfaz de usuario**: Hay una interfaz básica que permite hacer login, aunque no proporciona feedback en caso de contraseña incorrecta. Para probar las funcionalidades, se recomienda usar ThunderClient o Postman.

## Flujo de Trabajo

1. **Crear una cuenta**: Los usuarios pueden registrarse creando una cuenta.
2. **Iniciar sesión**: Al iniciar sesión, el usuario es redirigido a una página que muestra la base de datos de usuarios.
3. **Acceso protegido**: Usamos JWT para verificar si el usuario ha iniciado sesión y permitir el acceso a rutas protegidas.

## Recomendaciones

Para una mejor visualización y pruebas, se recomienda utilizar herramientas como ThunderClient o Postman.

## Código

El código del proyecto incluye las siguientes características:

- **Registro de usuarios**: Permite a los usuarios registrarse y guardar sus datos en la base de datos local.
- **Inicio de sesión**: Verifica las credenciales del usuario y establece una sesión utilizando cookies y JWT.
- **Rutas protegidas**: Solo accesibles si el usuario ha iniciado sesión correctamente.

Para más detalles sobre el código, consulta los archivos en el repositorio.

## Ejemplo de Cuerpo de Petición

El cuerpo de la petición para registro y login es el siguiente:
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