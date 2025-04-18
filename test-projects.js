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
let projectId = '';
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
    console.log('INICIANDO TEST DE PROYECTOS');
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
    
    // 3. Obtener clientes disponibles para asignar al proyecto
    console.log('\n3. OBTENIENDO CLIENTES DISPONIBLES');
    console.log('------------------------------------');
    
    try {
      response = await fetchWithCookies(`${BASE_URL}/api/clients`);
      if (response.ok) {
        data = await response.json();
        if (data && data.length > 0) {
          console.log('✅ Clientes disponibles:');
          data.forEach((client, index) => {
            console.log(`${index + 1}. ${client.nombre} ${client.apellidos} (${client.email}) - ID: ${client._id}`);
          });
          
          const clientIndex = await question('Seleccione el número del cliente a usar: ');
          if (clientIndex > 0 && clientIndex <= data.length) {
            clientId = data[clientIndex - 1]._id;
            console.log(`✅ Cliente seleccionado: ${data[clientIndex - 1].nombre} ${data[clientIndex - 1].apellidos}`);
          } else {
            throw new Error('No se seleccionó ningún cliente válido');
          }
        } else {
          throw new Error('No se encontraron clientes disponibles');
        }
      } else {
        throw new Error('No se pudo acceder a los clientes');
      }
    } catch (error) {
      console.log('❌ Error al obtener clientes:', error.message);
      throw new Error('Se requiere al menos un cliente para crear un proyecto');
    }
    
    // 4. Verificar si hay compañías disponibles
    console.log('\n4. COMPROBANDO COMPAÑÍAS DISPONIBLES');
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
    
    // 5. Crear un nuevo proyecto
    console.log('\n5. CREANDO NUEVO PROYECTO');
    console.log('------------------------------------');
    
    const timestamp = Date.now();
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setMonth(fechaFin.getMonth() + 1); // Un mes después
    
    const projectData = {
      titulo: `Proyecto de prueba ${timestamp}`,
      descripcion: `Descripción de prueba para el proyecto creado en el test con timestamp ${timestamp}`,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      estado: 'Pendiente',
      presupuesto: Math.floor(Math.random() * 10000) + 1000, // Presupuesto aleatorio entre 1000 y 11000
      clienteId: clientId,
      companiaId: companyId || undefined
    };
    
    console.log('Datos del proyecto a crear:');
    console.log(JSON.stringify(projectData, null, 2));
    
    response = await fetchWithCookies(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(`Error al crear proyecto: ${errorData.error || 'Error desconocido'}`);
      } catch (e) {
        // Si no se puede analizar como JSON, obtener el texto
        const errorText = await response.text();
        throw new Error(`Error al crear proyecto. Respuesta: ${errorText.substring(0, 100)}...`);
      }
    }
    
    data = await response.json();
    projectId = data._id;
    
    console.log('✅ Proyecto creado correctamente');
    console.log(`ID del proyecto: ${projectId}`);
    
    // 6. Obtener todos los proyectos
    console.log('\n6. OBTENIENDO LISTA DE PROYECTOS');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/projects`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener proyectos: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log(`✅ Se encontraron ${data.length} proyectos`);
    
    // 7. Obtener detalles del proyecto creado
    console.log('\n7. OBTENIENDO DETALLES DEL PROYECTO CREADO');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/projects/${projectId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener detalles del proyecto: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Detalles del proyecto:');
    console.log(JSON.stringify(data, null, 2));
    
    // 8. Actualizar el proyecto
    console.log('\n8. ACTUALIZANDO DATOS DEL PROYECTO');
    console.log('------------------------------------');
    
    const updateData = {
      titulo: `Proyecto actualizado ${timestamp}`,
      estado: 'En progreso',
      presupuesto: Math.floor(Math.random() * 10000) + 1000 // Nuevo presupuesto aleatorio
    };
    
    console.log('Datos a actualizar:');
    console.log(JSON.stringify(updateData, null, 2));
    
    response = await fetchWithCookies(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al actualizar proyecto: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Proyecto actualizado correctamente');
    console.log(JSON.stringify(data, null, 2));
    
    // 9. Verificar que solo vemos nuestros proyectos
    console.log('\n9. VERIFICANDO PROYECTOS CREADOS POR EL USUARIO');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/projects/me`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener proyectos del usuario: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log(`✅ Proyectos creados por el usuario actual: ${data.length}`);
    
    // 10. Verificar proyectos del cliente
    console.log('\n10. VERIFICANDO PROYECTOS DEL CLIENTE');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/projects/client/${clientId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener proyectos del cliente: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log(`✅ Proyectos asociados al cliente: ${data.length}`);
    
    // 11. Eliminar el proyecto creado
    console.log('\n11. ELIMINANDO PROYECTO');
    console.log('------------------------------------');
    
    const confirmarEliminacion = await question('¿Desea eliminar el proyecto creado? (s/n): ');
    
    if (confirmarEliminacion.toLowerCase() === 's') {
      response = await fetchWithCookies(`${BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al eliminar proyecto: ${errorData.error || 'Error desconocido'}`);
      }
      
      data = await response.json();
      console.log('✅ Proyecto eliminado correctamente');
      console.log(data);
    } else {
      console.log('❌ Eliminación cancelada por el usuario');
    }
    
    // 12. Cerrar sesión
    console.log('\n12. CERRANDO SESIÓN');
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
    console.log('¡TEST DE PROYECTOS COMPLETADO CON ÉXITO!');
    console.log('====================================');
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL TEST:', error.message);
  } finally {
    rl.close();
  }
};

// Ejecutar el test
runTest();


