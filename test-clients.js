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
let userEmail = '';
let userPassword = '';
let jwtToken = '';
let cookieJar = '';
let clientId = '';
let companyId = '';

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
    console.log('====================================');
    console.log('INICIANDO TEST DE CLIENTES');
    console.log('====================================\n');
    
    // 1. Solicitar credenciales de usuario ya validado
    console.log('\n1. CONFIGURACIÓN INICIAL');
    console.log('------------------------------------');
    userEmail = await question('Ingrese email de un usuario ya validado: ');
    userPassword = await question('Ingrese contraseña del usuario: ');
    
    // 2. Iniciar sesión con el usuario
    console.log('\n2. INICIANDO SESIÓN');
    console.log('------------------------------------');
    let response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: userPassword })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al iniciar sesión: ${errorData.error || 'Error desconocido'}`);
    }
    
    // Guardar las cookies (contienen el token JWT)
    saveCookies(response.headers);
    
    let data = await response.json();
    console.log('✅ Sesión iniciada correctamente');
    console.log(`Usuario: ${data.user.nombre} ${data.user.apellidos}`);
    
    jwtToken = data.token;
    userId = data.user._id;
    
    // 3. Verificar si hay compañías disponibles
    console.log('\n3. COMPROBANDO COMPAÑÍAS DISPONIBLES');
    console.log('------------------------------------');
    
    try {
      response = await fetchWithCookies(`${BASE_URL}/api/companies`);
      if (response.ok) {
        data = await response.json();
        if (data && data.length > 0) {
          console.log('✅ Compañías encontradas:');
          data.forEach((company, index) => {
            console.log(`${index + 1}. ${company.nombre} (${company.nif}) - ID: ${company._id}`);
          });
          
          const companyIndex = await question('Seleccione el número de la compañía a usar (o 0 para ninguna): ');
          if (companyIndex > 0 && companyIndex <= data.length) {
            companyId = data[companyIndex - 1]._id;
            console.log(`✅ Compañía seleccionada: ${data[companyIndex - 1].nombre}`);
          } else {
            console.log('❌ No se seleccionó ninguna compañía');
            companyId = '';
          }
        } else {
          console.log('❌ No se encontraron compañías');
        }
      } else {
        console.log('❌ No se pudo acceder a las compañías');
      }
    } catch (error) {
      console.log('❌ Error al obtener compañías:', error.message);
    }
    
    // 4. Crear un nuevo cliente
    console.log('\n4. CREANDO NUEVO CLIENTE');
    console.log('------------------------------------');
    
    const timestamp = Date.now();
    const clientData = {
      nombre: 'Cliente',
      apellidos: `Test ${timestamp}`,
      email: `cliente.test.${timestamp}@example.com`,
      telefono: `6${timestamp.toString().substring(0, 8)}`,
      nif: `T${timestamp.toString().substring(0, 8)}`,
      direccion: 'Calle de Prueba, 123, Ciudad de Prueba',
      companiaId: companyId || undefined
    };
    
    console.log('Datos del cliente a crear:');
    console.log(JSON.stringify(clientData, null, 2));
    
    response = await fetchWithCookies(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al crear cliente: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    clientId = data._id;
    
    console.log('✅ Cliente creado correctamente');
    console.log(`ID del cliente: ${clientId}`);
    
    // 5. Obtener todos los clientes
    console.log('\n5. OBTENIENDO LISTA DE CLIENTES');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/clients`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener clientes: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log(`✅ Se encontraron ${data.length} clientes`);
    
    // 6. Obtener detalles del cliente creado
    console.log('\n6. OBTENIENDO DETALLES DEL CLIENTE CREADO');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/clients/${clientId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener detalles del cliente: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Detalles del cliente:');
    console.log(JSON.stringify(data, null, 2));
    
    // 7. Actualizar el cliente
    console.log('\n7. ACTUALIZANDO DATOS DEL CLIENTE');
    console.log('------------------------------------');
    
    const updateData = {
      nombre: 'ClienteActualizado',
      telefono: `9${Date.now().toString().substring(0, 8)}`
    };
    
    console.log('Datos a actualizar:');
    console.log(JSON.stringify(updateData, null, 2));
    
    response = await fetchWithCookies(`${BASE_URL}/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al actualizar cliente: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Cliente actualizado correctamente');
    console.log(JSON.stringify(data, null, 2));
    
    // 8. Verificar que solo vemos nuestros clientes
    console.log('\n8. VERIFICANDO CLIENTES CREADOS POR EL USUARIO');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/clients/me`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener clientes del usuario: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log(`✅ Clientes creados por el usuario actual: ${data.length}`);
    
    // 9. Probar acceso a la ruta /clients-protected
    console.log('\n9. ACCEDIENDO A LA VISTA PROTEGIDA DE CLIENTES');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/clients-protected`);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error al acceder a la vista protegida: ${errorData || 'Error desconocido'}`);
    }
    
    console.log('✅ Acceso exitoso a la vista protegida de clientes');
    
    // 10. Eliminar el cliente creado
    console.log('\n10. ELIMINANDO CLIENTE');
    console.log('------------------------------------');
    
    const confirmarEliminacion = await question('¿Desea eliminar el cliente creado? (s/n): ');
    
    if (confirmarEliminacion.toLowerCase() === 's') {
      response = await fetchWithCookies(`${BASE_URL}/api/clients/${clientId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al eliminar cliente: ${errorData.error || 'Error desconocido'}`);
      }
      
      data = await response.json();
      console.log('✅ Cliente eliminado correctamente');
      console.log(data);
    } else {
      console.log('❌ Eliminación cancelada por el usuario');
    }
    
    // 11. Cerrar sesión
    console.log('\n11. CERRANDO SESIÓN');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/logout`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al cerrar sesión: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Sesión cerrada correctamente');
    
    console.log('\n====================================');
    console.log('¡TEST DE CLIENTES COMPLETADO CON ÉXITO!');
    console.log('====================================');
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL TEST:', error.message);
  } finally {
    rl.close();
  }
};

// Ejecutar el test
runTest();
