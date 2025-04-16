import fetch from 'node-fetch';
import readline from 'readline';
import dotenv from 'dotenv';

// Configurar variables de entorno
dotenv.config();

// Configurar readline para entrada por consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para preguntar al usuario
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

// URL base para las peticiones
const BASE_URL = 'http://localhost:3000';

// Variables para almacenar datos importantes entre pasos
let userId = '';
let validationCode = '';
let userEmail = `test_${Date.now()}@example.com`;
let userPassword = 'password123';
let newPassword = 'nuevaContraseña123';
let jwtToken = '';
let cookieJar = '';

// Función para manejar las cookies
const saveCookies = (headers) => {
  const cookies = headers.get('set-cookie');
  if (cookies) {
    cookieJar = cookies;
    console.log('Cookies guardadas.');
  }
};

// Función para hacer peticiones con cookies
const fetchWithCookies = async (url, options = {}) => {
  if (cookieJar) {
    options.headers = {
      ...options.headers,
      'Cookie': cookieJar
    };
  }
  return fetch(url, options);
};

// Función principal que ejecuta todos los pasos del test
const runTest = async () => {
  try {
    console.log('Iniciando test de la API...');
    
    // 1. Crear un usuario
    console.log('\n1. Registrando un nuevo usuario...');
    const userData = {
      email: userEmail,
      password: userPassword,
      nombre: 'Usuario',
      apellidos: 'De Prueba',
      nif: 'A12345678',
      direccion: 'Calle de Prueba, 123'
    };
    
    let response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    let data = await response.json();
    console.log('Respuesta:', data);
    
    if (!response.ok) {
      throw new Error(`Error al registrar usuario: ${data.error || 'Error desconocido'}`);
    }
    
    userId = data.id;
    validationCode = data.validationCode; // En un entorno real, esto vendría por email
    
    // 2. Validar el usuario con el código (pidiendo confirmación si es necesario)
    console.log('\n2. Validando el usuario...');
    
    // Si no tenemos el código de validación automáticamente, pedirlo al usuario
    if (!validationCode) {
      validationCode = await question('Introduce el código de validación recibido: ');
    } else {
      console.log(`Código de validación automático: ${validationCode}`);
      // Opcionalmente, permitir al usuario sobrescribir el código automático
      const override = await question('¿Quieres usar este código? (s/n): ');
      if (override.toLowerCase() === 'n') {
        validationCode = await question('Introduce el código de validación correcto: ');
      }
    }
    
    response = await fetch(`${BASE_URL}/api/user/validation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, code: validationCode })
    });
    
    data = await response.json();
    console.log('Respuesta:', data);
    
    if (!response.ok) {
      throw new Error(`Error al validar usuario: ${data.error || 'Error desconocido'}`);
    }
    
    // 3. Hacer login con el usuario
    console.log('\n3. Iniciando sesión...');
    response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: userPassword })
    });
    
    // Guardar las cookies (contienen el token JWT)
    saveCookies(response.headers);
    
    data = await response.json();
    console.log('Respuesta:', data);
    
    if (!response.ok) {
      throw new Error(`Error al iniciar sesión: ${data.error || 'Error desconocido'}`);
    }
    
    jwtToken = data.token;
    
    // 4. Cambiar la contraseña
    console.log('\n4. Cambiando la contraseña...');
    response = await fetchWithCookies(`${BASE_URL}/api/user/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: userPassword, newPassword: newPassword })
    });
    
    data = await response.json();
    console.log('Respuesta:', data);
    
    if (!response.ok) {
      throw new Error(`Error al cambiar la contraseña: ${data.error || 'Error desconocido'}`);
    }
    
    // Actualizar la contraseña local
    userPassword = newPassword;
    
    // 5. Acceder a una ruta protegida
    console.log('\n5. Accediendo a ruta protegida...');
    response = await fetchWithCookies(`${BASE_URL}/protected`);
    
    if (!response.ok) {
      data = await response.json();
      throw new Error(`Error al acceder a ruta protegida: ${data.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('Acceso exitoso a ruta protegida. Usuarios encontrados:', data.length);
    
    // 6. Hacer logout
    console.log('\n6. Cerrando sesión...');
    response = await fetchWithCookies(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    data = await response.json();
    console.log('Respuesta:', data);
    
    if (!response.ok) {
      throw new Error(`Error al cerrar sesión: ${data.error || 'Error desconocido'}`);
    }
    
    // Limpiar las cookies después del logout
    cookieJar = '';
    
    // 7. Intentar acceder a ruta protegida después del logout (debe fallar)
    console.log('\n7. Intentando acceder a ruta protegida después del logout...');
    response = await fetchWithCookies(`${BASE_URL}/protected`);
    
    if (response.ok) {
      throw new Error('Error: El acceso a ruta protegida debería haber fallado después del logout');
    }
    
    data = await response.json();
    console.log('Respuesta (error esperado):', data);
    
    // 8. Hacer login nuevamente con la nueva contraseña
    console.log('\n8. Iniciando sesión nuevamente con la nueva contraseña...');
    response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: userPassword })
    });
    
    // Guardar las cookies nuevamente
    saveCookies(response.headers);
    
    data = await response.json();
    console.log('Respuesta:', data);
    
    if (!response.ok) {
      throw new Error(`Error al iniciar sesión nuevamente: ${data.error || 'Error desconocido'}`);
    }
    
    jwtToken = data.token;
    
    // 9. Crear una compañía
    console.log('\n9. Creando una compañía...');
    const companyData = {
      emailJefe: userEmail,
      nif: `B${Date.now().toString().substring(0, 8)}`,
      nombre: 'Compañía de Prueba',
      miembros: [userEmail]
    };
    
    response = await fetchWithCookies(`${BASE_URL}/companies/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyData)
    });
    
    data = await response.json();
    console.log('Respuesta:', data);
    
    if (!response.ok) {
      throw new Error(`Error al crear compañía: ${data.error || 'Error desconocido'}`);
    }
    
    console.log('\n¡Test completado con éxito!');
    
  } catch (error) {
    console.error('Error durante el test:', error.message);
  } finally {
    rl.close();
  }
};

// Ejecutar el test
runTest();
